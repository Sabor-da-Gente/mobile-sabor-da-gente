import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { SCHEMA_V1 } from './schema';
import { SCHEMA_V2 } from './schema-v2';
import { popularCardapio } from './seed';

export const NOME_BANCO = 'sabor-da-gente.db';

export const VERSAO_ATUAL = 2;

export async function migrar(db: SQLiteDatabase): Promise<void> {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let versao = linha?.user_version ?? 0;

  if (versao === 0) {
    if (Platform.OS !== 'web') {
      await db.execAsync("PRAGMA journal_mode = 'wal';");
    }
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_V1);
      await popularCardapio(db);
    });
    versao = await salvarVersao(db, 1);
  }

  if (versao === 1) {
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    try {
      await db.withTransactionAsync(async () => {
        await db.execAsync(SCHEMA_V2);
        const quebradas = await db.getAllAsync('PRAGMA foreign_key_check');
        if (quebradas.length > 0) {
          throw new Error(`Migração 2 deixou ${quebradas.length} chave(s) estrangeira(s) inválida(s).`);
        }
      });
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON;');
    }
    versao = await salvarVersao(db, 2);
  }

  // Próximas versões:
  // if (versao === 2) {
  //   await db.execAsync('ALTER TABLE ...');
  //   versao = await salvarVersao(db, 3);
  // }

  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.runAsync("UPDATE fila_sincronizacao SET status = 'pendente' WHERE status = 'enviando'");
}

async function salvarVersao(db: SQLiteDatabase, versao: number): Promise<number> {
  await db.execAsync(`PRAGMA user_version = ${versao}`);
  return versao;
}
