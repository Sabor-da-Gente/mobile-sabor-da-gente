import type { StatusPedido } from '@/types';

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  recebido: 'Recebido',
  em_preparo: 'Em preparo',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const COR_STATUS: Record<StatusPedido, string> = {
  recebido: '#B7791F',
  em_preparo: '#2B6CB0',
  saiu_para_entrega: '#6B46C1',
  entregue: '#2F855A',
  cancelado: '#B42318',
};

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);

  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}