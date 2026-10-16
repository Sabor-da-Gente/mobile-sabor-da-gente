import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type { CardapioRepository } from '@/repositories/CardapioRepository';
import type { CarrinhoRepository } from '@/repositories/CarrinhoRepository';
import type { FavoritoRepository } from '@/repositories/FavoritoRepository';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import type { PerfilRepository } from '@/repositories/PerfilRepository';
import { SqliteCardapioRepository } from '@/repositories/sqlite/SqliteCardapioRepository';
import { SqliteCarrinhoRepository } from '@/repositories/sqlite/SqliteCarrinhoRepository';
import { SqliteFavoritoRepository } from '@/repositories/sqlite/SqliteFavoritoRepository';
import { SqlitePedidoRepository } from '@/repositories/sqlite/SqlitePedidoRepository';
import { SqlitePerfilRepository } from '@/repositories/sqlite/SqlitePerfilRepository';

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

export function usePerfilRepository(): PerfilRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SqlitePerfilRepository(db), [db]);
}

export function useFavoritoRepository(): FavoritoRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SqliteFavoritoRepository(db), [db]);
}
