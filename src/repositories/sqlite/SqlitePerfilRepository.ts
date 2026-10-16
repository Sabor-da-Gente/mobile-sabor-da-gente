import type { SQLiteDatabase } from 'expo-sqlite';

import {
  type DadosEndereco,
  Endereco,
  type EnderecoRow,
  type Perfil,
  type PerfilRow,
} from '@/models/Perfil';
import type { PerfilRepository } from '@/repositories/PerfilRepository';

const COLUNAS_ENDERECO =
  'id, apelido, logradouro, numero, complemento, bairro, cidade, uf, cep, referencia, principal';

export class SqlitePerfilRepository implements PerfilRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async buscarPerfil(): Promise<Perfil | null> {
    return this.db.getFirstAsync<PerfilRow>('SELECT nome, telefone, email FROM perfil WHERE id = 1');
  }

  async salvarPerfil(perfil: Perfil): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO perfil (id, nome, telefone, email) VALUES (1, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         nome = excluded.nome, telefone = excluded.telefone, email = excluded.email,
         atualizado_em = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`,
      perfil.nome,
      perfil.telefone,
      perfil.email,
    );
  }

  async listarEnderecos(): Promise<Endereco[]> {
    const rows = await this.db.getAllAsync<EnderecoRow>(
      `SELECT ${COLUNAS_ENDERECO} FROM enderecos WHERE ativo = 1 ORDER BY principal DESC, id DESC`,
    );
    return rows.map(Endereco.fromRow);
  }

  async buscarEndereco(id: number): Promise<Endereco | null> {
    const row = await this.db.getFirstAsync<EnderecoRow>(
      `SELECT ${COLUNAS_ENDERECO} FROM enderecos WHERE id = ? AND ativo = 1`,
      id,
    );
    return row ? Endereco.fromRow(row) : null;
  }

  async salvarEndereco(d: DadosEndereco, id?: number): Promise<number> {
    const valores = [d.apelido, d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf, d.cep, d.referencia];

    if (id !== undefined) {
      await this.db.runAsync(
        `UPDATE enderecos SET apelido = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?,
                cidade = ?, uf = ?, cep = ?, referencia = ?
          WHERE id = ? AND ativo = 1`,
        ...valores,
        id,
      );
      return id;
    }

    let novoId = 0;
    await this.db.withTransactionAsync(async () => {
      const ativos = await this.db.getFirstAsync<{ total: number }>(
        'SELECT COUNT(*) AS total FROM enderecos WHERE ativo = 1',
      );
      const resultado = await this.db.runAsync(
        `INSERT INTO enderecos
           (apelido, logradouro, numero, complemento, bairro, cidade, uf, cep, referencia, principal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ...valores,
        ativos?.total === 0 ? 1 : 0,
      );
      novoId = resultado.lastInsertRowId;
    });
    return novoId;
  }

  async marcarPrincipal(id: number): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('UPDATE enderecos SET principal = 0 WHERE principal = 1');
      await this.db.runAsync('UPDATE enderecos SET principal = 1 WHERE id = ? AND ativo = 1', id);
    });
  }

  async removerEndereco(id: number): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('UPDATE enderecos SET ativo = 0, principal = 0 WHERE id = ?', id);
      // Se era o principal, o mais recente que sobrou assume.
      await this.db.runAsync(
        `UPDATE enderecos SET principal = 1
          WHERE id = (SELECT id FROM enderecos WHERE ativo = 1 ORDER BY id DESC LIMIT 1)
            AND NOT EXISTS (SELECT 1 FROM enderecos WHERE ativo = 1 AND principal = 1)`,
      );
    });
  }
}
