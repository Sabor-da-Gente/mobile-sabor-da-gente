export function comLimite<T>(promessa: Promise<T>, ms: number, mensagem = 'Tempo esgotado.'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error(mensagem)), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}
