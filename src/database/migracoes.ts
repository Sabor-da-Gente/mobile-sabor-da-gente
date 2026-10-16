import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { SCHEMA_V1 } from './schema';
import { popularCardapio } from './seed';

export const NOME_BANCO = 'sabor-da-gente.db';

/** Aumente ao criar uma migração. */
export const VERSAO_ATUAL = 1;

/**
 * Aplica só as migrações que faltam, guiado por `PRAGMA user_version`.
 * Nunca edite uma versão já publicada: cada mudança vira um novo `if (versao === N)`.
 */
export async function migrar(db: SQLiteDatabase): Promise<void> {
  // Chaves estrangeiras vêm desligadas no SQLite e valem por conexão:
  // precisa rodar sempre, mesmo quando o banco já está atualizado.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versao = linha?.user_version ?? 0;
  if (versao >= VERSAO_ATUAL) return;

  if (versao === 0) {
    if (Platform.OS !== 'web') {
      await db.execAsync("PRAGMA journal_mode = 'wal';");
    }
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_V1);
      await popularCardapio(db);
    });
    versao = 1;
  }

  // Próximas versões:
  // if (versao === 1) {
  //   await db.execAsync('ALTER TABLE ...');
  //   versao = 2;
  // }

  await db.execAsync(`PRAGMA user_version = ${versao}`);
}
