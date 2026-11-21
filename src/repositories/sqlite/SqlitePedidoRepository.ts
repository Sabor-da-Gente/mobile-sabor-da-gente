import type { SQLiteDatabase } from 'expo-sqlite';

import { type ItemCarrinho, ItemPizza, ItemProduto } from '@/models/ItemCarrinho';
import type { PedidoRemoto } from '@/repositories/supabase/SupabasePedidoRepository';
import type {
  EventoStatus,
  FormaPagamento,
  ItemPedido,
  NovoPedido,
  Pedido,
  StatusPedido,
  TipoEntrega,
} from '@/types';

type FormaPagamentoRow = 'pix' | 'cartao' | 'dinheiro';

const PAGAMENTO_PARA_BANCO: Record<FormaPagamento, FormaPagamentoRow> = {
  Pix: 'pix',
  Cartão: 'cartao',
  Dinheiro: 'dinheiro',
};

const PAGAMENTO_DO_BANCO: Record<FormaPagamentoRow, FormaPagamento> = {
  pix: 'Pix',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
};

type PedidoRow = {
  id: number;
  numero: number | null;
  sincronizado: number;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_entrega: TipoEntrega;
  endereco_id: number | null;
  endereco_entrega: string | null;
  status: StatusPedido;
  forma_pagamento: FormaPagamentoRow;
  troco_para: number | null;
  subtotal: number;
  taxa_entrega: number;
  total: number;
  total_estimado: number | null;
  criado_em: string;
};

type ItemRow = {
  id: number;
  pedido_id: number;
  tipo: 'produto' | 'pizza';
  descricao: string;
  observacao: string | null;
  quantidade: number;
  preco_unitario: number;
};

type NomeRow = { item_id: number; nome: string };

type HistoricoRow = { pedido_id: number; status: StatusPedido; criado_em: string };

export type ConfirmacaoServidor = {
  idRemoto: string;
  numero: number;
  status: StatusPedido;
  subtotal: number;
  desconto: number;
  taxaEntrega: number;
  total: number;
};

const SELECT_PEDIDO =
  'SELECT id, numero, sincronizado, cliente_nome, cliente_telefone, tipo_entrega, endereco_id, ' +
  'endereco_entrega, status, forma_pagamento, troco_para, subtotal, taxa_entrega, total, ' +
  'total_estimado, criado_em FROM pedidos';

const SELECT_ITENS =
  'SELECT id, pedido_id, tipo, descricao, observacao, quantidade, preco_unitario FROM itens_pedido';

export class SqlitePedidoRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly usuarioId: string,
  ) {}

  async gravarNovo(novo: NovoPedido, itens: ItemCarrinho[], chaveCliente: string): Promise<number> {
    if (itens.length === 0) throw new Error('Pedido sem itens');

    const { lastInsertRowId: id } = await this.db.runAsync(
      `INSERT INTO pedidos
         (usuario_id, chave_cliente, sincronizado, cliente_nome, cliente_telefone, tipo_entrega,
          endereco_id, endereco_entrega, forma_pagamento, troco_para, subtotal, taxa_entrega, total,
          total_estimado)
       VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      this.usuarioId,
      chaveCliente,
      novo.clienteNome,
      novo.telefone,
      novo.tipoEntrega,
      novo.tipoEntrega === 'entrega' ? novo.enderecoId : null,
      novo.tipoEntrega === 'entrega' ? novo.endereco : null,
      PAGAMENTO_PARA_BANCO[novo.pagamento],
      novo.pagamento === 'Dinheiro' ? novo.trocoParaCentavos : null,
      novo.subtotalCentavos,
      novo.taxaEntregaCentavos,
      novo.totalCentavos,
      novo.totalCentavos,
    );

    for (const item of itens) {
      await this.gravarItem(id, item);
    }
    await this.db.runAsync(
      "INSERT INTO pedido_status_historico (pedido_id, status) VALUES (?, 'recebido')",
      id,
    );
    return id;
  }

  private async gravarItem(pedidoId: number, item: ItemCarrinho): Promise<void> {
    const pizza = item instanceof ItemPizza ? item : null;
    const { lastInsertRowId: itemId } = await this.db.runAsync(
      `INSERT INTO itens_pedido
         (pedido_id, tipo, produto_id, tamanho_id, massa_id, descricao,
          quantidade, preco_unitario, subtotal, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      pedidoId,
      item.tipo,
      item instanceof ItemProduto ? item.produto.id : null,
      pizza?.tamanho.id ?? null,
      pizza?.massa.id ?? null,
      pizza ? `${pizza.nome} · Massa ${pizza.massa.nome}` : item.nome,
      item.quantidade,
      item.precoUnitario(),
      item.subtotal(),
      item.observacao,
    );
    if (!pizza) return;

    for (const sabor of pizza.saboresEscolhidos) {
      await this.db.runAsync(
        'INSERT INTO itens_pedido_sabores (item_id, sabor_id, nome, preco) VALUES (?, ?, ?, ?)',
        itemId,
        sabor.id,
        sabor.nome,
        sabor.precoNoTamanho(pizza.tamanho.id) ?? 0,
      );
    }
    for (const adicional of pizza.adicionais) {
      await this.db.runAsync(
        'INSERT INTO itens_pedido_adicionais (item_id, adicional_id, nome, preco) VALUES (?, ?, ?, ?)',
        itemId,
        adicional.id,
        adicional.nome,
        adicional.preco,
      );
    }
  }

  async confirmarEnvio(id: number, c: ConfirmacaoServidor): Promise<void> {
    await this.db.runAsync(
      `UPDATE pedidos
          SET id_remoto = ?, numero = ?, status = ?, subtotal = ?, desconto = ?, taxa_entrega = ?,
              total = ?, sincronizado = 1
        WHERE id = ? AND usuario_id = ?`,
      c.idRemoto,
      c.numero,
      c.status,
      c.subtotal,
      c.desconto,
      c.taxaEntrega,
      c.total,
      id,
      this.usuarioId,
    );
  }

  async listar(): Promise<Pedido[]> {
    const rows = await this.db.getAllAsync<PedidoRow>(
      `${SELECT_PEDIDO} WHERE usuario_id = ? ORDER BY criado_em DESC, id DESC`,
      this.usuarioId,
    );
    return this.montar(rows);
  }

  async buscar(id: number): Promise<Pedido | null> {
    const row = await this.db.getFirstAsync<PedidoRow>(
      `${SELECT_PEDIDO} WHERE id = ? AND usuario_id = ?`,
      id,
      this.usuarioId,
    );
    if (!row) return null;
    const [pedido] = await this.montar([row]);
    return pedido;
  }

  async idRemoto(id: number): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ id_remoto: string | null }>(
      'SELECT id_remoto FROM pedidos WHERE id = ? AND usuario_id = ?',
      id,
      this.usuarioId,
    );
    return row?.id_remoto ?? null;
  }

  async contar(): Promise<number> {
    const row = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM pedidos WHERE usuario_id = ?',
      this.usuarioId,
    );
    return row?.total ?? 0;
  }

  async excluir(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM pedidos WHERE id = ? AND usuario_id = ?', id, this.usuarioId);
  }

  async importar(remotos: PedidoRemoto[]): Promise<void> {
    for (const r of remotos) {
      const existente = await this.db.getFirstAsync<{ id: number }>(
        `SELECT id FROM pedidos
          WHERE usuario_id = ? AND (id_remoto = ? OR (chave_cliente IS NOT NULL AND chave_cliente = ?))`,
        this.usuarioId,
        r.idRemoto,
        r.chaveCliente,
      );

      let id: number;
      if (existente) {
        id = existente.id;
        await this.db.runAsync(
          `UPDATE pedidos
              SET id_remoto = ?, numero = ?, status = ?, subtotal = ?, desconto = ?,
                  taxa_entrega = ?, total = ?, sincronizado = 1
            WHERE id = ?`,
          r.idRemoto,
          r.numero,
          r.status,
          r.subtotalCentavos,
          r.descontoCentavos,
          r.taxaEntregaCentavos,
          r.totalCentavos,
          id,
        );
      } else {
        id = await this.inserirRemoto(r);
      }

      if (r.historico.length > 0) {
        await this.db.runAsync(
          'DELETE FROM pedido_status_historico WHERE pedido_id = ? AND id_remoto IS NULL',
          id,
        );
        for (const h of r.historico) {
          await this.db.runAsync(
            `INSERT INTO pedido_status_historico (pedido_id, id_remoto, status, criado_em)
             VALUES (?, ?, ?, ?) ON CONFLICT (id_remoto) DO NOTHING`,
            id,
            h.idRemoto,
            h.status,
            h.em,
          );
        }
      }
    }
  }

  private async inserirRemoto(r: PedidoRemoto): Promise<number> {
    const { lastInsertRowId: id } = await this.db.runAsync(
      `INSERT INTO pedidos
         (usuario_id, id_remoto, numero, chave_cliente, sincronizado, cliente_nome, cliente_telefone,
          tipo_entrega, endereco_entrega, status, forma_pagamento, troco_para, subtotal, desconto,
          taxa_entrega, total, criado_em)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      this.usuarioId,
      r.idRemoto,
      r.numero,
      r.chaveCliente,
      r.clienteNome,
      r.telefone,
      r.tipoEntrega,
      r.tipoEntrega === 'entrega' ? r.endereco : null,
      r.status,
      PAGAMENTO_PARA_BANCO[r.pagamento],
      r.trocoParaCentavos,
      r.subtotalCentavos,
      r.descontoCentavos,
      r.taxaEntregaCentavos,
      r.totalCentavos,
      r.criadoEm,
    );

    for (const item of r.itens) {
      const { lastInsertRowId: itemId } = await this.db.runAsync(
        `INSERT INTO itens_pedido (pedido_id, tipo, descricao, quantidade, preco_unitario, subtotal, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        item.tipo,
        item.nome,
        item.quantidade,
        item.precoCentavos,
        item.precoCentavos * item.quantidade,
        item.observacao,
      );
      for (const nome of item.sabores) {
        await this.db.runAsync('INSERT INTO itens_pedido_sabores (item_id, nome) VALUES (?, ?)', itemId, nome);
      }
      for (const nome of item.adicionais) {
        await this.db.runAsync('INSERT INTO itens_pedido_adicionais (item_id, nome) VALUES (?, ?)', itemId, nome);
      }
    }
    return id;
  }

  private async montar(rows: PedidoRow[]): Promise<Pedido[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const marcadores = ids.map(() => '?').join(',');
    const doItem = `WHERE item_id IN (SELECT id FROM itens_pedido WHERE pedido_id IN (${marcadores}))`;

    const [itens, sabores, adicionais, historico] = await Promise.all([
      this.db.getAllAsync<ItemRow>(`${SELECT_ITENS} WHERE pedido_id IN (${marcadores}) ORDER BY id`, ids),
      this.db.getAllAsync<NomeRow>(`SELECT item_id, nome FROM itens_pedido_sabores ${doItem} ORDER BY id`, ids),
      this.db.getAllAsync<NomeRow>(`SELECT item_id, nome FROM itens_pedido_adicionais ${doItem} ORDER BY id`, ids),
      this.db.getAllAsync<HistoricoRow>(
        `SELECT pedido_id, status, criado_em FROM pedido_status_historico
          WHERE pedido_id IN (${marcadores}) ORDER BY criado_em, id`,
        ids,
      ),
    ]);
    return rows.map((row) => paraPedido(row, itens, sabores, adicionais, historico));
  }
}

function paraPedido(
  row: PedidoRow,
  itens: ItemRow[],
  sabores: NomeRow[],
  adicionais: NomeRow[],
  historico: HistoricoRow[],
): Pedido {
  return {
    id: row.id,
    numero: row.numero !== null ? String(row.numero) : '',
    clienteNome: row.cliente_nome,
    telefone: row.cliente_telefone,
    tipoEntrega: row.tipo_entrega,
    enderecoId: row.endereco_id,
    endereco: row.endereco_entrega ?? '',
    pagamento: PAGAMENTO_DO_BANCO[row.forma_pagamento],
    trocoParaCentavos: row.troco_para,
    itens: itens
      .filter((item) => item.pedido_id === row.id)
      .map((item) => paraItem(item, sabores, adicionais)),
    subtotalCentavos: row.subtotal,
    taxaEntregaCentavos: row.taxa_entrega,
    totalCentavos: row.total,
    status: row.status,
    historico: historico
      .filter((h) => h.pedido_id === row.id)
      .map((h): EventoStatus => ({ status: h.status, em: h.criado_em })),
    criadoEm: row.criado_em,
    sincronizado: row.sincronizado === 1,
    totalEstimadoCentavos: row.total_estimado,
  };
}

function paraItem(item: ItemRow, sabores: NomeRow[], adicionais: NomeRow[]): ItemPedido {
  const nomesDe = (lista: NomeRow[]) => lista.filter((n) => n.item_id === item.id).map((n) => n.nome);
  let nomesSabores = nomesDe(sabores);
  let observacao = item.observacao;

  if (item.tipo === 'pizza' && nomesSabores.length === 0 && observacao?.startsWith('[')) {
    try {
      nomesSabores = JSON.parse(observacao) as string[];
      observacao = null;
    } catch {
    }
  }

  return {
    nome: item.descricao,
    sabores: nomesSabores,
    adicionais: nomesDe(adicionais),
    observacao,
    precoCentavos: item.preco_unitario,
    quantidade: item.quantidade,
  };
}
