/** Formata um valor em reais: 45 -> "R$ 45,00". Para centavos, use `formatarCentavos`. */
export function formatarPreco(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

/** Formata um valor em centavos: 4500 -> "R$ 45,00". */
export function formatarCentavos(centavos: number): string {
  return formatarPreco(centavos / 100);
}

/** Lê um valor digitado ("50", "50,00", "R$ 1.050,50") e devolve centavos, ou `null` se inválido. */
export function lerCentavos(texto: string): number | null {
  const limpo = texto.replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}
