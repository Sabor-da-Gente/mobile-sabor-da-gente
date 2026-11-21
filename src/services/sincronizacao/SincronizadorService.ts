import type { SQLiteDatabase } from 'expo-sqlite';

import type { FilaRepository, ItemFila } from '@/repositories/FilaRepository';

import { buscarOperacao, FalhaEnvio, type ContextoEnvio } from './operacoes';

export const ESPERA_INICIAL_MS = 2_000;
export const ESPERA_MAXIMA_MS = 60_000;
export const LIMITE_ENVIO_MS = 15_000;
export const MAX_TENTATIVAS_DESCONHECIDAS = 5;

export type DependenciasSincronizador = {
  fila: FilaRepository;
  db: SQLiteDatabase;
  usuarioAtual: () => Promise<string | null>;
  online: () => boolean;
  limiteEnvioMs?: number;
};

export type ResultadoSincronizacao = 'concluida' | 'offline' | 'sem_usuario' | 'interrompida';

function comLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new FalhaEnvio('O servidor demorou para responder.', 'rede')), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

function mensagemDe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export class SincronizadorService {
  private emAndamento: Promise<ResultadoSincronizacao> | null = null;
  private rodarDeNovo = false;
  private espera = ESPERA_INICIAL_MS;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private parado = false;

  constructor(private readonly deps: DependenciasSincronizador) {}
  sincronizar(): Promise<ResultadoSincronizacao> {
    if (this.emAndamento) {
      this.rodarDeNovo = true;
      return this.emAndamento;
    }
    this.emAndamento = this.executar()
      .catch((e): ResultadoSincronizacao => {
        console.error('Falha ao sincronizar a fila:', e);
        this.agendarNovaTentativa();
        return 'interrompida';
      })
      .finally(() => {
        this.emAndamento = null;
        if (this.rodarDeNovo && !this.parado) {
          this.rodarDeNovo = false;
          void this.sincronizar();
        }
      });
    return this.emAndamento;
  }

  agora(): Promise<ResultadoSincronizacao> {
    this.cancelarTimer();
    this.espera = ESPERA_INICIAL_MS;
    return this.sincronizar();
  }

  parar(): void {
    this.parado = true;
    this.cancelarTimer();
  }

  private async executar(): Promise<ResultadoSincronizacao> {
    if (this.parado) return 'interrompida';
    if (!this.deps.online()) return 'offline';

    const usuarioId = await this.deps.usuarioAtual();
    if (!usuarioId) return 'sem_usuario';

    const contexto: ContextoEnvio = { db: this.deps.db, usuarioId };
    for (;;) {
      if (this.parado) return 'interrompida';
      const item = await this.deps.fila.proximo(usuarioId);
      if (!item) {
        this.espera = ESPERA_INICIAL_MS;
        return 'concluida';
      }
      if (!(await this.enviar(item, contexto))) {
        this.agendarNovaTentativa();
        return 'interrompida';
      }
    }
  }

  private async enviar(item: ItemFila, contexto: ContextoEnvio): Promise<boolean> {
    const { fila } = this.deps;
    const enviar = buscarOperacao(item.operacao);
    if (!enviar) {
      await fila.falhar(item.id, `Operação desconhecida: ${item.operacao}`);
      return true;
    }

    try {
      await comLimite(enviar(item.payload, contexto), this.deps.limiteEnvioMs ?? LIMITE_ENVIO_MS);
      await fila.concluir(item.id);
      this.espera = ESPERA_INICIAL_MS;
      return true;
    } catch (e) {
      const mensagem = mensagemDe(e);

      if (e instanceof FalhaEnvio && e.tipo === 'regra') {
        await fila.falhar(item.id, mensagem);
        return true;
      }
      if (e instanceof FalhaEnvio) {
        await fila.adiar(item.id, mensagem);
        return false;
      }
      if (item.tentativas + 1 >= MAX_TENTATIVAS_DESCONHECIDAS) {
        console.error('Erro inesperado ao sincronizar:', e);
        await fila.falhar(item.id, mensagem);
        return true;
      }
      await fila.adiar(item.id, mensagem);
      return false;
    }
  }

  private agendarNovaTentativa(): void {
    if (this.timer || this.parado) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.sincronizar();
    }, this.espera);
    this.espera = Math.min(this.espera * 2, ESPERA_MAXIMA_MS);
  }

  private cancelarTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
