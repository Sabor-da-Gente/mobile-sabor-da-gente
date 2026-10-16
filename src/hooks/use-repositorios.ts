import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type { CardapioRepository } from '@/repositories/CardapioRepository';
import { SqliteCardapioRepository } from '@/repositories/sqlite/SqliteCardapioRepository';

/** Ponto único de escolha da implementação: quando a API existir, troque aqui. */
export function useCardapioRepository(): CardapioRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SqliteCardapioRepository(db), [db]);
}
