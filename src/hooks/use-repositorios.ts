import { SupabasePedidoRepository } from '@/repositories/supabase/SupabasePedidoRepository';
import { SupabasePerfilRepository } from '@/repositories/supabase/SupabasePerfilRepository';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

import type { CardapioRepository } from '@/repositories/CardapioRepository';
import type { CarrinhoRepository } from '@/repositories/CarrinhoRepository';
import type { FavoritoRepository } from '@/repositories/FavoritoRepository';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import type { PerfilRepository } from '@/repositories/PerfilRepository';
import { SincronizadoCardapioRepository } from '@/repositories/supabase/SincronizadoCardapioRepository';
import { SqliteCarrinhoRepository } from '@/repositories/sqlite/SqliteCarrinhoRepository';
import { SqliteFavoritoRepository } from '@/repositories/sqlite/SqliteFavoritoRepository';

/** Ponto único de escolha da implementação: quando a API existir, troque aqui. */
export function useCardapioRepository(): CardapioRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SincronizadoCardapioRepository(db), [db]);
}

export function useCarrinhoRepository(): CarrinhoRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SqliteCarrinhoRepository(db), [db]);
}

export function usePedidoRepository(): PedidoRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SupabasePedidoRepository(new SqliteCarrinhoRepository(db)), [db]);
}

export function usePerfilRepository(): PerfilRepository {
  return useMemo(() => new SupabasePerfilRepository(), []);
}

export function useFavoritoRepository(): FavoritoRepository {
  const db = useSQLiteContext();
  return useMemo(() => new SqliteFavoritoRepository(db), [db]);
}
