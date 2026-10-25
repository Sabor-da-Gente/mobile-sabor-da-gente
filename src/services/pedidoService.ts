import type { ItemCarrinho } from '@/models/ItemCarrinho';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import type { NovoPedido, Pedido } from '@/types';

/** O status vem do servidor (a pizzaria muda pelo painel): o app só consulta. */
export function listarPedidos(repo: PedidoRepository): Promise<Pedido[]> {
  return repo.listar();
}

export function buscarPedido(repo: PedidoRepository, id: number): Promise<Pedido | null> {
  return repo.buscar(id);
}

/** Não existe mais "avançar status" no app. */
export async function avancarStatus(_repo: PedidoRepository, _pedido: Pedido): Promise<boolean> {
  return false;
}

export function cancelarPedido(repo: PedidoRepository, id: number): Promise<boolean> {
  return repo.cancelar(id);
}

export function excluirPedido(repo: PedidoRepository, id: number): Promise<void> {
  return repo.excluir(id);
}

/** Envia o pedido ao Supabase; o preço final é calculado pelo banco. */
export async function criarPedido(
  repo: PedidoRepository,
  novo: NovoPedido,
  itens: ItemCarrinho[],
): Promise<{ pedido: Pedido; enviado: boolean | undefined }> {
  const pedido = await repo.criar(novo, itens);
  return { pedido, enviado: true };
}
