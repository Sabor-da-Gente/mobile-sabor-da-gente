/**
 * Formata um valor em reais para exibição: 45 -> "R$ 45,00".
 *
 * Hoje as telas trabalham com reais (number). Na Etapa 1 o banco passa a
 * guardar centavos; use `formatarCentavos` para esses valores.
 */
export function formatarPreco(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

/** Formata um valor em centavos: 4500 -> "R$ 45,00". */
export function formatarCentavos(centavos: number): string {
  return formatarPreco(centavos / 100);
}
