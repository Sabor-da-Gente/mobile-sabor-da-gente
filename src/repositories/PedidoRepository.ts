import type { ItemCarrinho } from '@/models/ItemCarrinho';
import type { NovoPedido, Pedido, StatusPedido } from '@/types';

/** Hoje SQLite; depois a API (POST /pedidos, GET /pedidos). */
export interface PedidoRepository {
  /**
   * Grava pedido, itens (com sabores e adicionais), primeiro status e esvazia o
   * carrinho numa transação só: se algo falhar, nada muda.
   */
  criar(novo: NovoPedido, itens: ItemCarrinho[]): Promise<Pedido>;
  listar(): Promise<Pedido[]>;
  buscar(id: number): Promise<Pedido | null>;
  /**
   * Muda de `de` para `para` e registra no histórico com o horário `em`.
   * Devolve `false` se o pedido não estava mais em `de` (outro timer já mudou).
   */
  registrarStatus(id: number, de: StatusPedido, para: StatusPedido, em: string): Promise<boolean>;
  /** Só cancela enquanto o pedido está `recebido` (regra R7). */
  cancelar(id: number): Promise<boolean>;
  /** Remove o pedido do histórico do celular. */
  excluir(id: number): Promise<void>;
}
