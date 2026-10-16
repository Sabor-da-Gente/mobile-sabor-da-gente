import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type { CardapioRepository } from '@/repositories/CardapioRepository';
import type { CarrinhoRepository } from '@/repositories/CarrinhoRepository';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import { SqliteCardapioRepository } from '@/repositories/sqlite/SqliteCardapioRepository';
import { SqliteCarrinhoRepository } from '@/repositories/sqlite/SqliteCarrinhoRepository';
import { SqlitePedidoRepository } from '@/repositories/sqlite/SqlitePedidoRepository';

/** Ponto único de escolha da implementação: quando a API existir, troque aqui. */
export function useCardapioRepository(): CardapioRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SqliteCardapioRepository(db), [db]);
}

export function useCarrinhoRepository(): CarrinhoRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SqliteCarrinhoRepository(db), [db]);
}

export function usePedidoRepository(): PedidoRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SqlitePedidoRepository(db), [db]);
}
