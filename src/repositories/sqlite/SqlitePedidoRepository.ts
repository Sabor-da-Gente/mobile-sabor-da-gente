import type { SQLiteDatabase } from 'expo-sqlite';

import { type ItemCarrinho, ItemPizza, ItemProduto } from '@/models/ItemCarrinho';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import type { FormaPagamento, ItemPedido, NovoPedido, Pedido, StatusPedido, TipoEntrega } from '@/types';

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

type StatusPedidoRow =
  | 'realizado'
  | 'em_preparacao'
  | 'saiu_para_entrega'
  | 'pronto_para_retirada'
  | 'entregue'
  | 'cancelado';

// O app usa os nomes combinados com a API do admin; o banco, os do plano.
const STATUS_DO_BANCO: Record<StatusPedidoRow, StatusPedido> = {
  realizado: 'recebido',
  em_preparacao: 'em_preparo',
  saiu_para_entrega: 'saiu_para_entrega',
  pronto_para_retirada: 'saiu_para_entrega',
  entregue: 'entregue',
  cancelado: 'cancelado',
};

type PedidoRow = {
  id: number;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_entrega: TipoEntrega;
  endereco_id: number | null;
  endereco_entrega: string | null;
  status: StatusPedidoRow;
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
        "INSERT INTO pedido_status_historico (pedido_id, status) VALUES (?, 'realizado')",
        id,
      );

      // O carrinho só esvazia se o pedido inteiro foi gravado.
      await this.db.runAsync('DELETE FROM carrinho_itens');
    });

    const pedido = await this.buscar(id);
    if (!pedido) throw new Error(`Pedido ${id} não encontrado após salvar`);
    return pedido;
  }

  /** Snapshot: nomes e preços copiados, para o histórico não mudar com o cardápio. */
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
    const [itens, sabores, adicionais] = await Promise.all([
      this.db.getAllAsync<ItemRow>(`${SELECT_ITENS} ${filtro} ORDER BY id`, ...params),
      // rowid mantém a ordem em que foram escolhidos.
      this.db.getAllAsync<NomeRow>(
        `SELECT item_id, nome FROM itens_pedido_sabores ${doItem} ORDER BY rowid`,
        ...params,
      ),
      this.db.getAllAsync<NomeRow>(
        `SELECT item_id, nome FROM itens_pedido_adicionais ${doItem} ORDER BY rowid`,
        ...params,
      ),
    ]);
    return rows.map((row) => paraPedido(row, itens, sabores, adicionais));
  }

  async cancelar(id: number): Promise<boolean> {
    let cancelou = false;
    await this.db.withTransactionAsync(async () => {
      const resultado = await this.db.runAsync(
        "UPDATE pedidos SET status = 'cancelado' WHERE id = ? AND status = 'realizado'",
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
    // Itens e histórico saem junto (ON DELETE CASCADE).
    await this.db.runAsync('DELETE FROM pedidos WHERE id = ?', id);
  }
}

function paraPedido(
  row: PedidoRow,
  itens: ItemRow[],
  sabores: NomeRow[],
  adicionais: NomeRow[],
): Pedido {
  return {
    id: row.id,
    numero: String(row.id).padStart(4, '0'),
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
    status: STATUS_DO_BANCO[row.status],
    criadoEm: row.criado_em,
  };
}

function paraItem(item: ItemRow, sabores: NomeRow[], adicionais: NomeRow[]): ItemPedido {
  const nomesDe = (lista: NomeRow[]) => lista.filter((n) => n.item_id === item.id).map((n) => n.nome);
  let nomesSabores = nomesDe(sabores);
  let observacao = item.observacao;

  // Pedidos feitos antes da Etapa 4 guardavam os sabores como JSON na observação.
  if (item.tipo === 'pizza' && nomesSabores.length === 0 && observacao?.startsWith('[')) {
    try {
      nomesSabores = JSON.parse(observacao) as string[];
      observacao = null;
    } catch {
      // Não era JSON: é uma observação de verdade.
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
