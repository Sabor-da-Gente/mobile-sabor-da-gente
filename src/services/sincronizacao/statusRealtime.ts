import type { SQLiteDatabase } from 'expo-sqlite';

import { SqlitePedidoRepository } from '@/repositories/sqlite/SqlitePedidoRepository';
import {
  type PedidoRemoto,
  SupabasePedidoRepository,
} from '@/repositories/supabase/SupabasePedidoRepository';
import { supabase } from '@/services/supabase';

import { avisarDadosAtualizados } from './eventos';

const ESPERA_MS = 300;

export function assinarPedidos(db: SQLiteDatabase, usuarioId: string): () => void {
  const mudaram = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const processar = async () => {
    const ids = [...mudaram];
    mudaram.clear();
    try {
      const remoto = new SupabasePedidoRepository();
      const pedidos = (await Promise.all(ids.map((id) => remoto.buscar(usuarioId, id)))).filter(
        (p): p is PedidoRemoto => p !== null,
      );
      const local = new SqlitePedidoRepository(db, usuarioId);
      await db.withTransactionAsync(() => local.importar(pedidos));
      avisarDadosAtualizados();
    } catch (e) {
      console.warn('Não foi possível aplicar a mudança de status:', e);
    }
  };

  const canal = supabase
    .channel(`pedidos-${usuarioId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pedidos', filter: `cliente_id=eq.${usuarioId}` },
      (evento) => {
        const id = (evento.new as { id?: string } | null)?.id;
        if (!id) return;
        mudaram.add(id);
        clearTimeout(timer);
        timer = setTimeout(() => void processar(), ESPERA_MS);
      },
    )
    .subscribe();

  return () => {
    clearTimeout(timer);
    void supabase.removeChannel(canal);
  };
}
