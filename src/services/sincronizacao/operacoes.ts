import type { SQLiteDatabase } from 'expo-sqlite';

export type ContextoEnvio = { db: SQLiteDatabase; usuarioId: string };
export type EnviarOperacao<P> = (payload: P, contexto: ContextoEnvio) => Promise<void>;
export type TipoFalha = 'rede' | 'sessao' | 'regra';

export class FalhaEnvio extends Error {
  constructor(
    message: string,
    readonly tipo: TipoFalha,
  ) {
    super(message);
    this.name = 'FalhaEnvio';
  }
}

const operacoes = new Map<string, EnviarOperacao<never>>();

export function registrarOperacao<P>(nome: string, enviar: EnviarOperacao<P>): void {
  operacoes.set(nome, enviar as EnviarOperacao<never>);
}

export function buscarOperacao(nome: string): EnviarOperacao<unknown> | undefined {
  return operacoes.get(nome) as EnviarOperacao<unknown> | undefined;
}
