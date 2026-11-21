import type { SQLiteDatabase } from 'expo-sqlite';

import { SqlitePedidoRepository } from '@/repositories/sqlite/SqlitePedidoRepository';
import { SqlitePerfilRepository } from '@/repositories/sqlite/SqlitePerfilRepository';
import { SupabasePedidoRepository } from '@/repositories/supabase/SupabasePedidoRepository';
import { SupabasePerfilRepository } from '@/repositories/supabase/SupabasePerfilRepository';
import { onlineAgora } from '@/services/conexao';
import { comLimite } from '@/utils/tempo';

import { avisarDadosAtualizados } from './eventos';

const LIMITE_MS = 15_000;

export type UsuarioDaSessao = { id: string; email: string | null };

let emAndamento: Promise<boolean> | null = null;

export function atualizarDoServidor(db: SQLiteDatabase, usuario: UsuarioDaSessao): Promise<boolean> {
  if (!emAndamento) {
    emAndamento = executar(db, usuario).finally(() => {
      emAndamento = null;
    });
  }
  return emAndamento;
}

async function executar(db: SQLiteDatabase, usuario: UsuarioDaSessao): Promise<boolean> {
  if (!onlineAgora()) return false;

  const perfis = new SupabasePerfilRepository();
  try {
    const [perfil, enderecos, pedidos] = await comLimite(
      Promise.all([
        perfis.buscarPerfilDe(usuario.id, usuario.email),
        perfis.listarEnderecosDe(usuario.id),
        new SupabasePedidoRepository().listar(usuario.id),
      ]),
      LIMITE_MS,
      'Tempo esgotado ao atualizar os dados.',
    );

    const perfilLocal = new SqlitePerfilRepository(db, usuario.id);
    const pedidosLocal = new SqlitePedidoRepository(db, usuario.id);
    await db.withTransactionAsync(async () => {
      if (perfil) await perfilLocal.atualizarPerfilDoServidor(perfil);
      await perfilLocal.atualizarEnderecosDoServidor(enderecos);
      await pedidosLocal.importar(pedidos);
    });
    avisarDadosAtualizados();
    return true;
  } catch (e) {
    console.warn('Não foi possível atualizar os dados do servidor:', e);
    return false;
  }
}
