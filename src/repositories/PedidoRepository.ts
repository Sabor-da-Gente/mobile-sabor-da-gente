import type { ItemCarrinho } from '@/models/ItemCarrinho';
import type { NovoPedido, Pedido } from '@/types';

/** Hoje SQLite; depois a API (POST /pedidos, GET /pedidos). */
export interface PedidoRepository {
  /**
   * Grava pedido, itens (com sabores e adicionais), primeiro status e esvazia o
   * carrinho numa transação só: se algo falhar, nada muda.
   */
  criar(novo: NovoPedido, itens: ItemCarrinho[]): Promise<Pedido>;
  listar(): Promise<Pedido[]>;
  buscar(id: number): Promise<Pedido | null>;
  /** Só cancela enquanto o pedido está `recebido` (regra R7). */
  cancelar(id: number): Promise<boolean>;
  /** Remove o pedido do histórico do celular. */
  excluir(id: number): Promise<void>;
}
