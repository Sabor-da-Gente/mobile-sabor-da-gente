import type { PedidoRepository } from '@/repositories/PedidoRepository';
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

/**
 * Salva o pedido no celular e, se houver API configurada, tenta enviá-lo.
 * `enviado` é `undefined` quando não há API.
 */
export async function criarPedido(
  repo: PedidoRepository,
  novo: NovoPedido,
): Promise<{ pedido: Pedido; enviado: boolean | undefined }> {
  const pedido = await repo.criar(novo);
  const enviado = API_URL ? await enviarParaApi(pedido) : undefined;
  return { pedido, enviado };
}
