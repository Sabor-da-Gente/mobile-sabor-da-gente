import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  FilaRepository,
  ItemFila,
  OpcoesEnfileirar,
  ResumoFila,
  StatusItemFila,
} from '@/repositories/FilaRepository';
import { avisarFilaMudou, avisarNovoItem } from '@/services/sincronizacao/eventos';

type ItemFilaRow = {
  id: number;
  usuario_id: string;
  operacao: string;
  payload: string;
  status: StatusItemFila;
  tentativas: number;
  ultimo_erro: string | null;
  criado_em: string;
};

const COLUNAS = 'id, usuario_id, operacao, payload, status, tentativas, ultimo_erro, criado_em';
const AGORA = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

function paraItem(row: ItemFilaRow): ItemFila {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    operacao: row.operacao,
    payload: JSON.parse(row.payload),
    status: row.status,
    tentativas: row.tentativas,
    ultimoErro: row.ultimo_erro,
    criadoEm: row.criado_em,
  };
}

export class SqliteFilaRepository implements FilaRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async enfileirar(
    usuarioId: string,
    operacao: string,
    payload: unknown,
    { substituirPendentes = false, avisar = true }: OpcoesEnfileirar = {},
  ): Promise<number> {
    if (substituirPendentes) {
      await this.db.runAsync(
        "DELETE FROM fila_sincronizacao WHERE usuario_id = ? AND operacao = ? AND status = 'pendente'",
        usuarioId,
        operacao,
      );
    }
    const { lastInsertRowId } = await this.db.runAsync(
      'INSERT INTO fila_sincronizacao (usuario_id, operacao, payload) VALUES (?, ?, ?)',
      usuarioId,
      operacao,
      JSON.stringify(payload ?? null),
    );
    if (avisar) avisarNovoItem();
    return lastInsertRowId;
  }

  async proximo(usuarioId: string): Promise<ItemFila | null> {
    const row = await this.db.getFirstAsync<ItemFilaRow>(
      `UPDATE fila_sincronizacao SET status = 'enviando', atualizado_em = ${AGORA}
        WHERE id = (SELECT id FROM fila_sincronizacao
                     WHERE usuario_id = ? AND status = 'pendente' ORDER BY id LIMIT 1)
        RETURNING ${COLUNAS}`,
      usuarioId,
    );
    return row ? paraItem(row) : null;
  }

  async concluir(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM fila_sincronizacao WHERE id = ?', id);
    avisarFilaMudou();
  }

  async adiar(id: number, mensagem: string): Promise<void> {
    await this.marcar(id, 'pendente', mensagem);
  }

  async falhar(id: number, mensagem: string): Promise<void> {
    await this.marcar(id, 'erro', mensagem);
  }

  async buscarPendente(usuarioId: string, operacao: string, idLocal: number): Promise<ItemFila | null> {
    const row = await this.db.getFirstAsync<ItemFilaRow>(
      `SELECT ${COLUNAS} FROM fila_sincronizacao
        WHERE usuario_id = ? AND operacao = ? AND status = 'pendente'
          AND json_extract(payload, '$.idLocal') = ?
        ORDER BY id DESC LIMIT 1`,
      usuarioId,
      operacao,
      idLocal,
    );
    return row ? paraItem(row) : null;
  }

  async atualizarPayload(id: number, payload: unknown): Promise<void> {
    await this.db.runAsync(
      `UPDATE fila_sincronizacao SET payload = ?, atualizado_em = ${AGORA}
        WHERE id = ? AND status = 'pendente'`,
      JSON.stringify(payload ?? null),
      id,
    );
  }

  async removerPendentes(usuarioId: string, operacao: string, idLocal: number): Promise<void> {
    await this.db.runAsync(
      `DELETE FROM fila_sincronizacao
        WHERE usuario_id = ? AND operacao = ? AND status = 'pendente'
          AND json_extract(payload, '$.idLocal') = ?`,
      usuarioId,
      operacao,
      idLocal,
    );
  }

  async reenviar(id: number): Promise<void> {
    await this.db.runAsync(
      `UPDATE fila_sincronizacao SET status = 'pendente', tentativas = 0, atualizado_em = ${AGORA}
        WHERE id = ? AND status = 'erro'`,
      id,
    );
    avisarNovoItem();
  }

  async descartar(id: number): Promise<void> {
    await this.db.runAsync("DELETE FROM fila_sincronizacao WHERE id = ? AND status <> 'enviando'", id);
    avisarFilaMudou();
  }

  async listar(usuarioId: string): Promise<ItemFila[]> {
    const rows = await this.db.getAllAsync<ItemFilaRow>(
      `SELECT ${COLUNAS} FROM fila_sincronizacao WHERE usuario_id = ? ORDER BY id`,
      usuarioId,
    );
    return rows.map(paraItem);
  }

  async resumo(usuarioId: string): Promise<ResumoFila> {
    const row = await this.db.getFirstAsync<ResumoFila>(
      `SELECT COALESCE(SUM(status <> 'erro'), 0) AS pendentes, COALESCE(SUM(status = 'erro'), 0) AS erros
         FROM fila_sincronizacao WHERE usuario_id = ?`,
      usuarioId,
    );
    return row ?? { pendentes: 0, erros: 0 };
  }

  private async marcar(id: number, status: StatusItemFila, mensagem: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE fila_sincronizacao
          SET status = ?, tentativas = tentativas + 1, ultimo_erro = ?, atualizado_em = ${AGORA}
        WHERE id = ?`,
      status,
      mensagem,
      id,
    );
    avisarFilaMudou();
  }
}
