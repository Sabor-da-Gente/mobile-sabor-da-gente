import type { SQLiteDatabase } from 'expo-sqlite';

import {
  type DadosEndereco,
  Endereco,
  type EnderecoRow,
  type Perfil,
  type PerfilRow,
} from '@/models/Perfil';
import type { PerfilRepository } from '@/repositories/PerfilRepository';

const OPERACOES_ENDERECO = "('criar_endereco','editar_endereco','endereco_principal','remover_endereco')";

const COLUNAS_ENDERECO =
  'id, apelido, logradouro, numero, complemento, bairro, cidade, uf, cep, referencia, principal, sincronizado';

export class SqlitePerfilRepository implements PerfilRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly usuarioId: string,
  ) {}

  async buscarPerfil(): Promise<Perfil | null> {
    return this.db.getFirstAsync<PerfilRow>(
      'SELECT nome, telefone, email FROM perfil WHERE usuario_id = ?',
      this.usuarioId,
    );
  }

  async salvarPerfil(perfil: Perfil): Promise<void> {
    await this.gravarPerfil(perfil, false);
  }

  async gravarPerfil(perfil: Perfil, sincronizado: boolean): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO perfil (usuario_id, nome, telefone, email, sincronizado) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (usuario_id) DO UPDATE SET
         nome = excluded.nome, telefone = excluded.telefone, email = excluded.email,
         sincronizado = excluded.sincronizado,
         atualizado_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`,
      this.usuarioId,
      perfil.nome,
      perfil.telefone,
      perfil.email,
      sincronizado ? 1 : 0,
    );
  }
  async atualizarPerfilDoServidor(remoto: Perfil): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO perfil (usuario_id, nome, telefone, email, sincronizado) VALUES (?1, ?2, ?3, ?4, 1)
       ON CONFLICT (usuario_id) DO UPDATE SET
         nome = excluded.nome, telefone = excluded.telefone, email = excluded.email, sincronizado = 1,
         atualizado_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
       WHERE NOT EXISTS (SELECT 1 FROM fila_sincronizacao
                          WHERE usuario_id = ?1 AND operacao = 'salvar_perfil')`,
      this.usuarioId,
      remoto.nome,
      remoto.telefone,
      remoto.email,
    );
  }

  async marcarPerfilSincronizado(enviado: { nome: string; telefone: string }): Promise<void> {
    await this.db.runAsync(
      'UPDATE perfil SET sincronizado = 1 WHERE usuario_id = ? AND nome = ? AND telefone = ?',
      this.usuarioId,
      enviado.nome,
      enviado.telefone,
    );
  }

  async listarEnderecos(): Promise<Endereco[]> {
    const rows = await this.db.getAllAsync<EnderecoRow>(
      `SELECT ${COLUNAS_ENDERECO} FROM enderecos
        WHERE usuario_id = ? AND ativo = 1 ORDER BY principal DESC, id DESC`,
      this.usuarioId,
    );
    return rows.map(Endereco.fromRow);
  }

  async buscarEndereco(id: number): Promise<Endereco | null> {
    const row = await this.db.getFirstAsync<EnderecoRow>(
      `SELECT ${COLUNAS_ENDERECO} FROM enderecos WHERE id = ? AND usuario_id = ? AND ativo = 1`,
      id,
      this.usuarioId,
    );
    return row ? Endereco.fromRow(row) : null;
  }

  async salvarEndereco(d: DadosEndereco, id?: number): Promise<number> {
    const valores = [d.apelido, d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf, d.cep, d.referencia];

    if (id !== undefined) {
      await this.db.runAsync(
        `UPDATE enderecos SET apelido = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?,
                cidade = ?, uf = ?, cep = ?, referencia = ?, sincronizado = 0
          WHERE id = ? AND usuario_id = ? AND ativo = 1`,
        ...valores,
        id,
        this.usuarioId,
      );
      return id;
    }

    const { lastInsertRowId } = await this.db.runAsync(
      `INSERT INTO enderecos
         (usuario_id, apelido, logradouro, numero, complemento, bairro, cidade, uf, cep, referencia, principal)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
               NOT EXISTS (SELECT 1 FROM enderecos WHERE usuario_id = ?1 AND ativo = 1))`,
      this.usuarioId,
      ...valores,
    );
    return lastInsertRowId;
  }

  async marcarPrincipal(id: number): Promise<void> {
    await this.db.runAsync(
      `UPDATE enderecos SET principal = (id = ?1)
        WHERE usuario_id = ?2 AND (principal = 1 OR id = ?1)
          AND EXISTS (SELECT 1 FROM enderecos WHERE id = ?1 AND usuario_id = ?2 AND ativo = 1)`,
      id,
      this.usuarioId,
    );
  }

  async removerEndereco(id: number): Promise<void> {
    await this.db.runAsync(
      'UPDATE enderecos SET ativo = 0, principal = 0, sincronizado = 0 WHERE id = ? AND usuario_id = ?',
      id,
      this.usuarioId,
    );
    await this.db.runAsync(
      `UPDATE enderecos SET principal = 1
        WHERE id = (SELECT id FROM enderecos WHERE usuario_id = ?1 AND ativo = 1 ORDER BY id DESC LIMIT 1)
          AND NOT EXISTS (SELECT 1 FROM enderecos WHERE usuario_id = ?1 AND ativo = 1 AND principal = 1)`,
      this.usuarioId,
    );
  }

  async idPrincipal(): Promise<number | null> {
    const row = await this.db.getFirstAsync<{ id: number }>(
      'SELECT id FROM enderecos WHERE usuario_id = ? AND ativo = 1 AND principal = 1',
      this.usuarioId,
    );
    return row?.id ?? null;
  }

  async contarEnderecos(): Promise<number> {
    const row = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM enderecos WHERE usuario_id = ?',
      this.usuarioId,
    );
    return row?.total ?? 0;
  }

  async idRemoto(id: number): Promise<number | null> {
    const row = await this.db.getFirstAsync<{ id_remoto: number | null }>(
      'SELECT id_remoto FROM enderecos WHERE id = ? AND usuario_id = ?',
      id,
      this.usuarioId,
    );
    return row?.id_remoto ?? null;
  }

  async idsRemotos(): Promise<number[]> {
    const rows = await this.db.getAllAsync<{ id_remoto: number }>(
      'SELECT id_remoto FROM enderecos WHERE usuario_id = ? AND id_remoto IS NOT NULL',
      this.usuarioId,
    );
    return rows.map((r) => r.id_remoto);
  }

  async definirIdRemoto(id: number, idRemoto: number): Promise<void> {
    await this.db.runAsync(
      'UPDATE enderecos SET id_remoto = ? WHERE id = ? AND usuario_id = ?',
      idRemoto,
      id,
      this.usuarioId,
    );
  }

  async marcarEnderecoSincronizado(id: number): Promise<void> {
    await this.db.runAsync(
      `UPDATE enderecos SET sincronizado = 1
        WHERE id = ?1 AND usuario_id = ?2
          AND NOT EXISTS (SELECT 1 FROM fila_sincronizacao
                           WHERE usuario_id = ?2 AND status <> 'enviando'
                             AND operacao IN ('criar_endereco','editar_endereco','endereco_principal','remover_endereco')
                             AND json_extract(payload, '$.idLocal') = ?1)`,
      id,
      this.usuarioId,
    );
  }

  async atualizarEnderecosDoServidor(remotos: Endereco[]): Promise<boolean> {
    const esperando = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM fila_sincronizacao
        WHERE usuario_id = ? AND status IN ('pendente','enviando') AND operacao IN ${OPERACOES_ENDERECO}`,
      this.usuarioId,
    );
    if ((esperando?.total ?? 0) > 0) return false;

    const comErro = `EXISTS (SELECT 1 FROM fila_sincronizacao f
                     WHERE f.usuario_id = enderecos.usuario_id AND f.operacao IN ${OPERACOES_ENDERECO}
                       AND json_extract(f.payload, '$.idLocal') = enderecos.id)`;

    for (const e of remotos) {
      const d = e.dados;
      await this.db.runAsync(
        `UPDATE enderecos
            SET apelido = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, uf = ?,
                cep = ?, referencia = ?, principal = ?, ativo = 1, sincronizado = 1
          WHERE usuario_id = ? AND id_remoto = ? AND NOT ${comErro}`,
        d.apelido,
        d.logradouro,
        d.numero,
        d.complemento,
        d.bairro,
        d.cidade,
        d.uf,
        d.cep,
        d.referencia,
        e.principal ? 1 : 0,
        this.usuarioId,
        e.id,
      );
    }
    await this.importarEnderecos(remotos);

    const ids = remotos.map((e) => e.id);
    await this.db.runAsync(
      `UPDATE enderecos SET ativo = 0, principal = 0, sincronizado = 1
        WHERE usuario_id = ? AND ativo = 1 AND id_remoto IS NOT NULL
          AND id_remoto NOT IN (${ids.map(() => '?').join(',')}) AND NOT ${comErro}`,
      this.usuarioId,
      ...ids,
    );
    return true;
  }

  async importarEnderecos(remotos: Endereco[]): Promise<void> {
    for (const e of remotos) {
      const d = e.dados;
      await this.db.runAsync(
        `INSERT INTO enderecos
           (usuario_id, id_remoto, apelido, logradouro, numero, complemento, bairro, cidade, uf, cep,
            referencia, principal, sincronizado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT (usuario_id, id_remoto) WHERE id_remoto IS NOT NULL DO NOTHING`,
        this.usuarioId,
        e.id,
        d.apelido,
        d.logradouro,
        d.numero,
        d.complemento,
        d.bairro,
        d.cidade,
        d.uf,
        d.cep,
        d.referencia,
        e.principal ? 1 : 0,
      );
    }
  }
}
