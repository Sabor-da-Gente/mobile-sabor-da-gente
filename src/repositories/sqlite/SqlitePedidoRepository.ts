import type { SQLiteDatabase } from 'expo-sqlite';

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
  pedido_id: number;
  descricao: string;
  sabores: string | null;
  quantidade: number;
  preco_unitario: number;
};

// Até a Etapa 2 o carrinho não guarda IDs de sabores, então os nomes vão como
// JSON na observação do item em vez de itens_pedido_sabores.

export class SqlitePedidoRepository implements PedidoRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async criar(novo: NovoPedido): Promise<Pedido> {
    let id = 0;

    // Pedido, itens e primeiro status entram juntos ou nada entra.
    await this.db.withTransactionAsync(async () => {
      const resultado = await this.db.runAsync(
        `INSERT INTO pedidos
           (cliente_nome, cliente_telefone, tipo_entrega, endereco_entrega,
            forma_pagamento, troco_para, subtotal, taxa_entrega, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        novo.clienteNome,
        novo.telefone,
        novo.tipoEntrega,
        novo.tipoEntrega === 'entrega' ? novo.endereco : null,
        PAGAMENTO_PARA_BANCO[novo.pagamento],
        novo.pagamento === 'Dinheiro' ? novo.trocoParaCentavos : null,
        novo.subtotalCentavos,
        novo.taxaEntregaCentavos,
        novo.totalCentavos,
      );
      id = resultado.lastInsertRowId;

      for (const item of novo.itens) {
        await this.db.runAsync(
          `INSERT INTO itens_pedido
             (pedido_id, tipo, descricao, quantidade, preco_unitario, subtotal, observacao)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          id,
          item.sabores.length > 0 ? 'pizza' : 'produto',
          item.nome,
          item.quantidade,
          item.precoCentavos,
          item.precoCentavos * item.quantidade,
          item.sabores.length > 0 ? JSON.stringify(item.sabores) : null,
        );
      }

      await this.db.runAsync(
        "INSERT INTO pedido_status_historico (pedido_id, status) VALUES (?, 'realizado')",
        id,
      );
    });

    const pedido = await this.buscar(id);
    if (!pedido) throw new Error(`Pedido ${id} não encontrado após salvar`);
    return pedido;
  }

  async listar(): Promise<Pedido[]> {
    const rows = await this.db.getAllAsync<PedidoRow>(
      'SELECT * FROM pedidos ORDER BY criado_em DESC, id DESC',
    );
    const itens = await this.db.getAllAsync<ItemRow>(
      `SELECT pedido_id, descricao, observacao AS sabores, quantidade, preco_unitario
         FROM itens_pedido ORDER BY id`,
    );
    return rows.map((row) => paraPedido(row, itens));
  }

  async buscar(id: number): Promise<Pedido | null> {
    const row = await this.db.getFirstAsync<PedidoRow>('SELECT * FROM pedidos WHERE id = ?', id);
    if (!row) return null;
    const itens = await this.db.getAllAsync<ItemRow>(
      `SELECT pedido_id, descricao, observacao AS sabores, quantidade, preco_unitario
         FROM itens_pedido WHERE pedido_id = ? ORDER BY id`,
      id,
    );
    return paraPedido(row, itens);
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

function paraPedido(row: PedidoRow, itens: ItemRow[]): Pedido {
  return {
    id: row.id,
    numero: String(row.id).padStart(4, '0'),
    clienteNome: row.cliente_nome,
    telefone: row.cliente_telefone,
    tipoEntrega: row.tipo_entrega,
    endereco: row.endereco_entrega ?? '',
    pagamento: PAGAMENTO_DO_BANCO[row.forma_pagamento],
    trocoParaCentavos: row.troco_para,
    itens: itens
      .filter((item) => item.pedido_id === row.id)
      .map(
        (item): ItemPedido => ({
          nome: item.descricao,
          sabores: item.sabores ? (JSON.parse(item.sabores) as string[]) : [],
          precoCentavos: item.preco_unitario,
          quantidade: item.quantidade,
        }),
      ),
    subtotalCentavos: row.subtotal,
    taxaEntregaCentavos: row.taxa_entrega,
    totalCentavos: row.total,
    status: STATUS_DO_BANCO[row.status],
    criadoEm: row.criado_em,
  };
}
