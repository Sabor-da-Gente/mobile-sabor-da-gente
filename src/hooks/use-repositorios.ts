import { useAuth } from '@/context/AuthContext';
import type { CardapioRepository } from '@/repositories/CardapioRepository';
import type { CarrinhoRepository } from '@/repositories/CarrinhoRepository';
import type { FavoritoRepository } from '@/repositories/FavoritoRepository';
import { OfflinePedidoRepository } from '@/repositories/offline/OfflinePedidoRepository';
import { OfflinePerfilRepository } from '@/repositories/offline/OfflinePerfilRepository';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import type { PerfilRepository } from '@/repositories/PerfilRepository';
import { SqliteCarrinhoRepository } from '@/repositories/sqlite/SqliteCarrinhoRepository';
import { SqliteFavoritoRepository } from '@/repositories/sqlite/SqliteFavoritoRepository';
import { SincronizadoCardapioRepository } from '@/repositories/supabase/SincronizadoCardapioRepository';
import { SupabasePedidoRepository } from '@/repositories/supabase/SupabasePedidoRepository';
import { SupabasePerfilRepository } from '@/repositories/supabase/SupabasePerfilRepository';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';

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
  const { user } = useAuth();
  const id = user?.id ?? null;
  return useMemo(
    () => new OfflinePedidoRepository(db, id, new SupabasePedidoRepository()),
    [db, id],
  );
}

export function usePerfilRepository(): PerfilRepository {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const id = user?.id ?? null;
  const email = user?.email ?? null;
  return useMemo(
    () =>
      new OfflinePerfilRepository(db, id ? { id, email } : null, new SupabasePerfilRepository()),
    [db, id, email],
  );
}

export function useFavoritoRepository(): FavoritoRepository {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const id = user?.id ?? null;
  return useMemo(() => new SqliteFavoritoRepository(db, id), [db, id]);
}