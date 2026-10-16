import type { ItemCarrinho } from '@/models/ItemCarrinho';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import { atualizarStatus, avancarAgora, finalizado } from '@/services/StatusService';
import type { NovoPedido, Pedido } from '@/types';

/** Endereço da API do painel (DAW III). Sem ele, o pedido fica só no celular. */
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TEMPO_LIMITE_API_MS = 4000;

async function enviarParaApi(pedido: Pedido): Promise<boolean> {
  const controlador = new AbortController();
  const cronometro = setTimeout(() => controlador.abort(), TEMPO_LIMITE_API_MS);

  try {
    const resposta = await fetch(`${API_URL}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
      signal: controlador.signal,
    });

    return resposta.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(cronometro);
  }
}

/** Lista já com o status em dia (regra R6). */
export async function listarPedidos(repo: PedidoRepository): Promise<Pedido[]> {
  const pedidos = await repo.listar();
  let mudou = false;
  for (const pedido of pedidos.filter((p) => !finalizado(p))) {
    mudou = (await atualizarStatus(repo, pedido)) || mudou;
  }
  return mudou ? repo.listar() : pedidos;
}

/** Busca já com o status em dia (regra R6). */
export async function buscarPedido(repo: PedidoRepository, id: number): Promise<Pedido | null> {
  const pedido = await repo.buscar(id);
  if (pedido && (await atualizarStatus(repo, pedido))) return repo.buscar(id);
  return pedido;
}

export function avancarStatus(repo: PedidoRepository, pedido: Pedido): Promise<boolean> {
  return avancarAgora(repo, pedido);
}

export function cancelarPedido(repo: PedidoRepository, id: number): Promise<boolean> {
  return repo.cancelar(id);
}

export function excluirPedido(repo: PedidoRepository, id: number): Promise<void> {
  return repo.excluir(id);
}

/**
 * Salva o pedido no celular e, se houver API configurada, tenta enviá-lo.
 * `enviado` é `undefined` quando não há API.
 */
export async function criarPedido(
  repo: PedidoRepository,
  novo: NovoPedido,
  itens: ItemCarrinho[],
): Promise<{ pedido: Pedido; enviado: boolean | undefined }> {
  const pedido = await repo.criar(novo, itens);
  const enviado = API_URL ? await enviarParaApi(pedido) : undefined;
  return { pedido, enviado };
}
