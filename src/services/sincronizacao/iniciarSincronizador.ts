import type { SQLiteDatabase } from 'expo-sqlite';
import { AppState } from 'react-native';

import {
  OfflineFavoritoRepository,
  registrarOperacoesFavorito,
} from '@/repositories/offline/OfflineFavoritoRepository';
import { registrarOperacoesPedido } from '@/repositories/offline/OfflinePedidoRepository';
import { registrarOperacoesPerfil } from '@/repositories/offline/OfflinePerfilRepository';
import { SqliteFilaRepository } from '@/repositories/sqlite/SqliteFilaRepository';
import { usuarioAtual } from '@/repositories/supabase/util';
import { aoVoltarConexao, onlineAgora } from '@/services/conexao';
import { supabase } from '@/services/supabase';

import { atualizarDoServidor } from './atualizarDoServidor';
import { ouvirNovosItens } from './eventos';
import { type ResultadoSincronizacao, SincronizadorService } from './SincronizadorService';
import { assinarPedidos } from './statusRealtime';

export function iniciarSincronizador(db: SQLiteDatabase): {
  sincronizador: SincronizadorService;
  atualizar: () => Promise<ResultadoSincronizacao>;
  encerrar: () => void;
} {
  registrarOperacoesPerfil();
  registrarOperacoesPedido();
  registrarOperacoesFavorito();

  const sincronizador = new SincronizadorService({
    fila: new SqliteFilaRepository(db),
    db,
    usuarioAtual: async () => (await usuarioAtual())?.id ?? null,
    online: onlineAgora,
  });

  const atualizar = async (): Promise<ResultadoSincronizacao> => {
    const usuario = await usuarioAtual();
    if (usuario) {
      try {
        await new OfflineFavoritoRepository(db, usuario.id).adotarFavoritosDoAparelho();
      } catch (e) {
        console.warn('Não foi possível enviar os favoritos do aparelho:', e);
      }
    }
    const resultado = await sincronizador.agora();
    if (resultado === 'concluida' && usuario) await atualizarDoServidor(db, usuario);
    return resultado;
  };

  const appState = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') void atualizar();
  });
  let assinatura: { usuarioId: string; cancelar: () => void } | null = null;
  const assinarStatus = (usuarioId: string | null) => {
    if (assinatura?.usuarioId === usuarioId) return;
    assinatura?.cancelar();
    assinatura = usuarioId ? { usuarioId, cancelar: assinarPedidos(db, usuarioId) } : null;
  };

  const auth = supabase.auth.onAuthStateChange((evento, sessao) => {
    setTimeout(() => {
      assinarStatus(sessao?.user.id ?? null);
      if (evento === 'SIGNED_IN') void atualizar();
    }, 0);
  });
  const cancelamentos = [
    aoVoltarConexao(() => void atualizar()),
    ouvirNovosItens(() => void sincronizador.sincronizar()),
    () => appState.remove(),
    () => auth.data.subscription.unsubscribe(),
    () => assinarStatus(null),
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
