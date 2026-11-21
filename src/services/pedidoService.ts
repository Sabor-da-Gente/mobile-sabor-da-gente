import type { ItemCarrinho } from '@/models/ItemCarrinho';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import type { NovoPedido, Pedido } from '@/types';

export function listarPedidos(repo: PedidoRepository): Promise<Pedido[]> {
  return repo.listar();
}

export function buscarPedido(repo: PedidoRepository, id: number): Promise<Pedido | null> {
  return repo.buscar(id);
}

export async function avancarStatus(_repo: PedidoRepository, _pedido: Pedido): Promise<boolean> {
  return false;
}

export function cancelarPedido(repo: PedidoRepository, id: number): Promise<boolean> {
  return repo.cancelar(id);
}

export function excluirPedido(repo: PedidoRepository, id: number): Promise<void> {
  return repo.excluir(id);
}

export async function criarPedido(
  repo: PedidoRepository,
  novo: NovoPedido,
  itens: ItemCarrinho[],
): Promise<Pedido> {
  return repo.criar(novo, itens);
}
