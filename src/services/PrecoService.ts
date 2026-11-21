import type { Adicional, Massa, Sabor, Tamanho } from '@/models/Pizza';
import type { TipoEntrega } from '@/types';

export const TAXA_ENTREGA_CENTAVOS = 500;

export function problemaNosSabores(tamanho: Tamanho, sabores: Sabor[]): string | null {
  if (sabores.length === 0) return 'Escolha pelo menos um sabor.';
  if (sabores.length > tamanho.maxSabores) {
    return `A pizza ${tamanho.nome} aceita até ${tamanho.maxSabores} sabores.`;
  }
  if (new Set(sabores.map((s) => s.id)).size !== sabores.length) {
    return 'Não repita o mesmo sabor.';
  }
  const indisponivel = sabores.find((s) => !s.disponivelNo(tamanho.id));
  if (indisponivel) return `${indisponivel.nome} não é vendida no tamanho ${tamanho.nome}.`;
  return null;
}

export function precoPizza(
  tamanho: Tamanho,
  massa: Massa,
  sabores: Sabor[],
  adicionais: Adicional[],
): number {
  const precosSabores = sabores.map((s) => s.precoNoTamanho(tamanho.id) ?? 0);
  const base = precosSabores.length > 0 ? Math.max(...precosSabores) : 0;
  return base + massa.acrescimo + adicionais.reduce((soma, a) => soma + a.preco, 0);
}

export function taxaEntrega(tipo: TipoEntrega, taxa: number = TAXA_ENTREGA_CENTAVOS): number {
  return tipo === 'entrega' ? taxa : 0;
}

export function calcularTotais(
  subtotal: number,
  tipo: TipoEntrega,
  taxaConfigurada: number = TAXA_ENTREGA_CENTAVOS,
) {
  const taxa = taxaEntrega(tipo, taxaConfigurada);
  return { subtotal, taxaEntrega: taxa, total: subtotal + taxa };
}