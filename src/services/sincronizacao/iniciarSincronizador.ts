import type { SQLiteDatabase } from 'expo-sqlite';
import { AppState } from 'react-native';

import { registrarOperacoesPerfil } from '@/repositories/offline/OfflinePerfilRepository';
import { usuarioAtual } from '@/repositories/supabase/util';
import { SqliteFilaRepository } from '@/repositories/sqlite/SqliteFilaRepository';
import { aoVoltarConexao, onlineAgora } from '@/services/conexao';
import { supabase } from '@/services/supabase';

import { ouvirNovosItens } from './eventos';
import { SincronizadorService } from './SincronizadorService';

export function iniciarSincronizador(db: SQLiteDatabase): {
  sincronizador: SincronizadorService;
  encerrar: () => void;
} {
  registrarOperacoesPerfil();

  const sincronizador = new SincronizadorService({
    fila: new SqliteFilaRepository(db),
    db,
    usuarioAtual: async () => (await usuarioAtual())?.id ?? null,
    online: onlineAgora,
  });

  const appState = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') void sincronizador.agora();
  });
  const auth = supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_IN') void sincronizador.agora();
  });
  const cancelamentos = [
    aoVoltarConexao(() => void sincronizador.agora()),
    ouvirNovosItens(() => void sincronizador.sincronizar()),
    () => appState.remove(),
    () => auth.data.subscription.unsubscribe(),
  ];

  void sincronizador.agora();

  return {
    sincronizador,
    encerrar: () => {
      sincronizador.parar();
      for (const cancelar of cancelamentos) cancelar();
    },
  };
}
