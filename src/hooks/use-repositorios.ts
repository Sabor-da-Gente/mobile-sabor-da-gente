import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type { CardapioRepository } from '@/repositories/CardapioRepository';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import { SqliteCardapioRepository } from '@/repositories/sqlite/SqliteCardapioRepository';
import { SqlitePedidoRepository } from '@/repositories/sqlite/SqlitePedidoRepository';

/** Ponto único de escolha da implementação: quando a API existir, troque aqui. */
export function useCardapioRepository(): CardapioRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SqliteCardapioRepository(db), [db]);
}

export function usePedidoRepository(): PedidoRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SqlitePedidoRepository(db), [db]);
}
