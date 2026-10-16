import type { PedidoRepository } from '@/repositories/PedidoRepository';
import type { Pedido, StatusPedido, TipoEntrega } from '@/types';

type Etapa = { status: StatusPedido; /** Segundos depois da etapa anterior. */ apos: number };

/** Regra R6: o caminho do pedido e quanto tempo cada etapa leva (simulado). */
export const FLUXO: Record<TipoEntrega, Etapa[]> = {
  entrega: [
    { status: 'recebido', apos: 0 },
    { status: 'em_preparo', apos: 30 },
    { status: 'saiu_para_entrega', apos: 60 },
    { status: 'entregue', apos: 60 },
  ],
  retirada: [
    { status: 'recebido', apos: 0 },
    { status: 'em_preparo', apos: 30 },
    { status: 'pronto_para_retirada', apos: 60 },
    { status: 'entregue', apos: 60 },
  ],
};

/** Regra R7. */
export function podeCancelar(pedido: Pedido): boolean {
  return pedido.status === 'recebido';
}

export function finalizado(pedido: Pedido): boolean {
  return pedido.status === 'entregue' || pedido.status === 'cancelado';
}

export function proximoStatus(pedido: Pedido): StatusPedido | null {
  if (pedido.status === 'cancelado') return null;
  const fluxo = FLUXO[pedido.tipoEntrega];
  const atual = fluxo.findIndex((e) => e.status === pedido.status);
  return fluxo[atual + 1]?.status ?? null;
}

/** "2026-10-16T14:05:30Z": mesmo formato que o SQLite grava. */
const paraIso = (data: Date) => data.toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * Etapas que já deveriam ter acontecido até `agora` e ainda não foram gravadas,
 * cada uma com o horário em que teria acontecido.
 */
export function etapasAtrasadas(pedido: Pedido, agora = new Date()): { status: StatusPedido; em: string }[] {
  if (finalizado(pedido)) return [];
  const fluxo = FLUXO[pedido.tipoEntrega];
  const atual = fluxo.findIndex((e) => e.status === pedido.status);

  // Conta o tempo a partir da última etapa gravada (ou da criação do pedido).
  const ultimoRegistro = pedido.historico.at(-1)?.em ?? pedido.criadoEm;
  let momento = new Date(ultimoRegistro).getTime();
  const atrasadas: { status: StatusPedido; em: string }[] = [];

  for (const etapa of fluxo.slice(atual + 1)) {
    momento += etapa.apos * 1000;
    if (momento > agora.getTime()) break;
    atrasadas.push({ status: etapa.status, em: paraIso(new Date(momento)) });
  }
  return atrasadas;
}

/**
 * Grava as etapas atrasadas. Chamado ao abrir o pedido e a cada poucos segundos,
 * o status "alcança" o tempo mesmo que o app tenha ficado fechado.
 * Devolve `true` se algo mudou.
 */
export async function atualizarStatus(repo: PedidoRepository, pedido: Pedido): Promise<boolean> {
  let anterior = pedido.status;
  let mudou = false;
  for (const etapa of etapasAtrasadas(pedido)) {
    // Se outro toque/timer já avançou, para aqui.
    if (!(await repo.registrarStatus(pedido.id, anterior, etapa.status, etapa.em))) break;
    anterior = etapa.status;
    mudou = true;
  }
  return mudou;
}

/** Botão "Avançar status (demo)": vai para a próxima etapa agora. */
export async function avancarAgora(repo: PedidoRepository, pedido: Pedido): Promise<boolean> {
  const proximo = proximoStatus(pedido);
  if (!proximo) return false;
  return repo.registrarStatus(pedido.id, pedido.status, proximo, paraIso(new Date()));
}
