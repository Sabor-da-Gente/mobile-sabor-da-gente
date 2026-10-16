import type { NovoPedido, Pedido } from '@/types';

/** Hoje SQLite; depois a API (POST /pedidos, GET /pedidos). */
export interface PedidoRepository {
  criar(novo: NovoPedido): Promise<Pedido>;
  listar(): Promise<Pedido[]>;
  buscar(id: number): Promise<Pedido | null>;
  /** Só cancela enquanto o pedido está `recebido` (regra R7). */
  cancelar(id: number): Promise<boolean>;
  /** Remove o pedido do histórico do celular. */
  excluir(id: number): Promise<void>;
}
