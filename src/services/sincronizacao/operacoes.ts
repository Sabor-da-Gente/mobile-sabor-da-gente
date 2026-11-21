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

export type AoDescartar<P> = (payload: P, contexto: ContextoEnvio) => Promise<void>;

type Registro = { enviar: EnviarOperacao<never>; aoDescartar?: AoDescartar<never> };

const operacoes = new Map<string, Registro>();

export function registrarOperacao<P>(
  nome: string,
  enviar: EnviarOperacao<P>,
  opcoes: { aoDescartar?: AoDescartar<P> } = {},
): void {
  operacoes.set(nome, {
    enviar: enviar as EnviarOperacao<never>,
    aoDescartar: opcoes.aoDescartar as AoDescartar<never> | undefined,
  });
}

export function buscarOperacao(nome: string): EnviarOperacao<unknown> | undefined {
  return operacoes.get(nome)?.enviar as EnviarOperacao<unknown> | undefined;
}

export function buscarAoDescartar(nome: string): AoDescartar<unknown> | undefined {
  return operacoes.get(nome)?.aoDescartar as AoDescartar<unknown> | undefined;
}
