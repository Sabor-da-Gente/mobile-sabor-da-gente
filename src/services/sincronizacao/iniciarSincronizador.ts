import type { SQLiteDatabase } from 'expo-sqlite';
import { AppState } from 'react-native';

import { registrarOperacoesPedido } from '@/repositories/offline/OfflinePedidoRepository';
import { registrarOperacoesPerfil } from '@/repositories/offline/OfflinePerfilRepository';
import { usuarioAtual } from '@/repositories/supabase/util';
import { SqliteFilaRepository } from '@/repositories/sqlite/SqliteFilaRepository';
import { aoVoltarConexao, onlineAgora } from '@/services/conexao';
import { supabase } from '@/services/supabase';

import { ouvirNovosItens } from './eventos';
import { atualizarDoServidor } from './atualizarDoServidor';
import { type ResultadoSincronizacao, SincronizadorService } from './SincronizadorService';

export function iniciarSincronizador(db: SQLiteDatabase): {
  sincronizador: SincronizadorService;
  atualizar: () => Promise<ResultadoSincronizacao>;
  encerrar: () => void;
} {
  registrarOperacoesPerfil();
  registrarOperacoesPedido();

  const sincronizador = new SincronizadorService({
    fila: new SqliteFilaRepository(db),
    db,
    usuarioAtual: async () => (await usuarioAtual())?.id ?? null,
    online: onlineAgora,
  });

  const atualizar = async (): Promise<ResultadoSincronizacao> => {
    const resultado = await sincronizador.agora();
    if (resultado === 'concluida') {
      const usuario = await usuarioAtual();
      if (usuario) await atualizarDoServidor(db, usuario);
    }
    return resultado;
  };

  const appState = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') void atualizar();
  });
  const auth = supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_IN') setTimeout(() => void atualizar(), 0);
  });
  const cancelamentos = [
    aoVoltarConexao(() => void atualizar()),
    ouvirNovosItens(() => void sincronizador.sincronizar()),
    () => appState.remove(),
    () => auth.data.subscription.unsubscribe(),
  ];

  void atualizar();

  return {
    sincronizador,
    atualizar,
    encerrar: () => {
      sincronizador.parar();
      for (const cancelar of cancelamentos) cancelar();
    },
  };
}
