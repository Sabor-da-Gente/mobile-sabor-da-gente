const soDigitos = (texto: string) => texto.replace(/\D/g, '');

/** Telefone brasileiro com DDD: 10 (fixo) ou 11 (celular) dígitos. */
export function telefoneValido(texto: string): boolean {
  const digitos = soDigitos(texto);
  return digitos.length === 10 || digitos.length === 11;
}

/** "83999990000" -> "(83) 99999-0000". Devolve o texto como veio se não tiver 10 ou 11 dígitos. */
export function formatarTelefone(texto: string): string {
  const d = soDigitos(texto);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return texto.trim();
}

export function cepValido(texto: string): boolean {
  return soDigitos(texto).length === 8;
}

export function formatarCep(texto: string): string {
  const d = soDigitos(texto);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : texto.trim();
}

export function emailValido(texto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto.trim());
}
