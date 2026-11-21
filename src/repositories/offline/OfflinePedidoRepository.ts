import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { ItemCarrinho } from '@/models/ItemCarrinho';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import { SqliteFilaRepository } from '@/repositories/sqlite/SqliteFilaRepository';
import { SqlitePedidoRepository } from '@/repositories/sqlite/SqlitePedidoRepository';
import { SqlitePerfilRepository } from '@/repositories/sqlite/SqlitePerfilRepository';
import {
  PAGAMENTO_PARA_BANCO,
  paraItemRpc,
  type ItemRpc,
  type SupabasePedidoRepository,
} from '@/repositories/supabase/SupabasePedidoRepository';
import { falhaDoSupabase } from '@/repositories/supabase/util';
import { onlineAgora } from '@/services/conexao';
import { avisarNovoItem } from '@/services/sincronizacao/eventos';
import { FalhaEnvio, registrarOperacao } from '@/services/sincronizacao/operacoes';
import { supabase } from '@/services/supabase';
import type { NovoPedido, Pedido, StatusPedido } from '@/types';

const LIMITE_ATUALIZACAO_MS = 5_000;

type PayloadCriarPedido = {
  idLocal: number;
  chaveCliente: string;
  itens: ItemRpc[];
  tipoEntrega: NovoPedido['tipoEntrega'];
  formaPagamento: string;
  enderecoIdLocal: number | null;
  trocoPara: number | null;
};

type RespostaCriarPedido = {
  id: string;
  numero: number;
  status: StatusPedido;
  subtotal: number;
  desconto: number;
  taxaEntrega: number;
  total: number;
};

function comLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error('Tempo esgotado ao atualizar os pedidos.')), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

export class OfflinePedidoRepository implements PedidoRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly usuarioId: string | null,
    private readonly remoto: SupabasePedidoRepository,
  ) {}

  private local(usuarioId: string) {
    return new SqlitePedidoRepository(this.db, usuarioId);
  }

  async criar(novo: NovoPedido, itens: ItemCarrinho[]): Promise<Pedido> {
    if (!this.usuarioId) throw new Error('Entre na sua conta para fazer o pedido.');
    const usuarioId = this.usuarioId;
    const local = this.local(usuarioId);
    let idLocal = 0;

    await this.db.withTransactionAsync(async () => {
      const chaveCliente = randomUUID();
      idLocal = await local.gravarNovo(novo, itens, chaveCliente);

      const payload: PayloadCriarPedido = {
        idLocal,
        chaveCliente,
        itens: itens.map(paraItemRpc),
        tipoEntrega: novo.tipoEntrega,
        formaPagamento: PAGAMENTO_PARA_BANCO[novo.pagamento],
        enderecoIdLocal: novo.tipoEntrega === 'entrega' ? novo.enderecoId : null,
        trocoPara: novo.pagamento === 'Dinheiro' ? novo.trocoParaCentavos : null,
      };
      await new SqliteFilaRepository(this.db).enfileirar(usuarioId, 'criar_pedido', payload, {
        avisar: false,
      });
      await this.db.runAsync('DELETE FROM carrinho_itens');
    });
    avisarNovoItem();

    const pedido = await local.buscar(idLocal);
    if (!pedido) throw new Error(`Pedido ${idLocal} não encontrado após salvar`);
    return pedido;
  }

  async listar(): Promise<Pedido[]> {
    if (!this.usuarioId) return [];
    const local = this.local(this.usuarioId);
    await this.atualizar(local, () => this.remoto.listar(this.usuarioId as string));
    return local.listar();
  }

  async buscar(id: number): Promise<Pedido | null> {
    if (!this.usuarioId) return null;
    const usuarioId = this.usuarioId;
    const local = this.local(usuarioId);
    const idRemoto = await local.idRemoto(id);
    if (idRemoto) {
      await this.atualizar(local, async () => {
        const remoto = await this.remoto.buscar(usuarioId, idRemoto);
        return remoto ? [remoto] : [];
      });
    }
    return local.buscar(id);
  }
  private async atualizar(
    local: SqlitePedidoRepository,
    buscar: () => Promise<Awaited<ReturnType<SupabasePedidoRepository['listar']>>>,
  ): Promise<void> {
    if (!onlineAgora()) return;
    try {
      const remotos = await comLimite(buscar(), LIMITE_ATUALIZACAO_MS);
      await this.db.withTransactionAsync(() => local.importar(remotos));
    } catch (e) {
      console.warn('Pedidos não atualizados do servidor:', e);
    }
  }

  async registrarStatus(): Promise<boolean> {
    return false;
  }

  async cancelar(id: number): Promise<boolean> {
    if (!this.usuarioId) return false;
    const idRemoto = await this.local(this.usuarioId).idRemoto(id);
    if (!idRemoto) {
      throw new Error('O pedido ainda não foi enviado à pizzaria. Tente cancelar depois do envio.');
    }
    const cancelou = await this.remoto.cancelar(idRemoto);
    await this.buscar(id);
    return cancelou;
  }

  async excluir(): Promise<void> {
    throw new Error('Pedidos enviados à pizzaria não podem ser apagados do histórico.');
  }
}

export function registrarOperacoesPedido(): void {
  registrarOperacao<PayloadCriarPedido>(
    'criar_pedido',
    async (p, { db, usuarioId }) => {
      let enderecoRemoto: number | null = null;
      if (p.enderecoIdLocal !== null) {
        enderecoRemoto = await new SqlitePerfilRepository(db, usuarioId).idRemoto(p.enderecoIdLocal);
        if (enderecoRemoto === null) {
          throw new FalhaEnvio('O endereço de entrega não pôde ser enviado.', 'regra');
        }
      }

      const { data, error, status } = await supabase.rpc('criar_pedido', {
        p_itens: p.itens,
        p_tipo_entrega: p.tipoEntrega,
        p_forma_pagamento: p.formaPagamento,
        p_endereco_id: enderecoRemoto,
        p_troco_para: p.trocoPara,
        p_cupom: null,
        p_observacao: null,
        p_chave_cliente: p.chaveCliente,
      });
      if (error) throw falhaDoSupabase(error, status);

      const r = data as RespostaCriarPedido;
      await new SqlitePedidoRepository(db, usuarioId).confirmarEnvio(p.idLocal, {
        idRemoto: r.id,
        numero: r.numero,
        status: r.status,
        subtotal: r.subtotal,
        desconto: r.desconto ?? 0,
        taxaEntrega: r.taxaEntrega,
        total: r.total,
      });
    },
    {
      aoDescartar: async (p, { db, usuarioId }) => {
        await new SqlitePedidoRepository(db, usuarioId).excluir(p.idLocal);
      },
    },
  );
}
