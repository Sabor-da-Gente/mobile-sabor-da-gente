import type { SQLiteDatabase } from 'expo-sqlite';

import { type ItemCarrinho, ItemPizza, ItemProduto } from '@/models/ItemCarrinho';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
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

const SELECT_ITENS =
  'SELECT id, pedido_id, tipo, descricao, observacao, quantidade, preco_unitario FROM itens_pedido';

export class SqlitePedidoRepository implements PedidoRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async criar(novo: NovoPedido, itens: ItemCarrinho[]): Promise<Pedido> {
    if (itens.length === 0) throw new Error('Pedido sem itens');
    let id = 0;

    await this.db.withTransactionAsync(async () => {
      const resultado = await this.db.runAsync(
        `INSERT INTO pedidos
           (cliente_nome, cliente_telefone, tipo_entrega, endereco_id, endereco_entrega,
            forma_pagamento, troco_para, subtotal, taxa_entrega, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      );
      id = resultado.lastInsertRowId;

      for (const item of itens) {
        await this.gravarItem(id, item);
      }

      await this.db.runAsync(
        "INSERT INTO pedido_status_historico (pedido_id, status) VALUES (?, 'recebido')",
        id,
      );

      await this.db.runAsync('DELETE FROM carrinho_itens');
    });

    const pedido = await this.buscar(id);
    if (!pedido) throw new Error(`Pedido ${id} não encontrado após salvar`);
    return pedido;
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

  async listar(): Promise<Pedido[]> {
    const rows = await this.db.getAllAsync<PedidoRow>(
      'SELECT * FROM pedidos ORDER BY criado_em DESC, id DESC',
    );
    return this.montar(rows, '');
  }

  async buscar(id: number): Promise<Pedido | null> {
    const row = await this.db.getFirstAsync<PedidoRow>('SELECT * FROM pedidos WHERE id = ?', id);
    if (!row) return null;
    const [pedido] = await this.montar([row], 'WHERE pedido_id = ?', id);
    return pedido;
  }

  private async montar(rows: PedidoRow[], filtro: string, ...params: number[]): Promise<Pedido[]> {
    const doItem = `WHERE item_id IN (SELECT id FROM itens_pedido ${filtro})`;
    const [itens, sabores, adicionais, historico] = await Promise.all([
      this.db.getAllAsync<ItemRow>(`${SELECT_ITENS} ${filtro} ORDER BY id`, ...params),
      this.db.getAllAsync<NomeRow>(
        `SELECT item_id, nome FROM itens_pedido_sabores ${doItem} ORDER BY id`,
        ...params,
      ),
      this.db.getAllAsync<NomeRow>(
        `SELECT item_id, nome FROM itens_pedido_adicionais ${doItem} ORDER BY id`,
        ...params,
      ),
      this.db.getAllAsync<HistoricoRow>(
        `SELECT pedido_id, status, criado_em FROM pedido_status_historico ${filtro}
          ORDER BY criado_em, id`,
        ...params,
      ),
    ]);
    return rows.map((row) => paraPedido(row, itens, sabores, adicionais, historico));
  }

  async registrarStatus(
    id: number,
    de: StatusPedido,
    para: StatusPedido,
    em: string,
  ): Promise<boolean> {
    let mudou = false;
    await this.db.withTransactionAsync(async () => {
      const resultado = await this.db.runAsync(
        'UPDATE pedidos SET status = ? WHERE id = ? AND status = ?',
        para,
        id,
        de,
      );
      mudou = resultado.changes > 0;
      if (mudou) {
        await this.db.runAsync(
          'INSERT INTO pedido_status_historico (pedido_id, status, criado_em) VALUES (?, ?, ?)',
          id,
          para,
          em,
        );
      }
    });
    return mudou;
  }

  async cancelar(id: number): Promise<boolean> {
    let cancelou = false;
    await this.db.withTransactionAsync(async () => {
      const resultado = await this.db.runAsync(
        "UPDATE pedidos SET status = 'cancelado' WHERE id = ? AND status = 'recebido'",
        id,
      );
      cancelou = resultado.changes > 0;
      if (cancelou) {
        await this.db.runAsync(
          "INSERT INTO pedido_status_historico (pedido_id, status) VALUES (?, 'cancelado')",
          id,
        );
      }
    });
    return cancelou;
  }

  async excluir(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM pedidos WHERE id = ?', id);
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
    numero: row.numero !== null ? String(row.numero) : String(row.id).padStart(4, '0'),
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
