import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { SqliteFilaRepository } from '@/repositories/sqlite/SqliteFilaRepository';
import { buscarAoDescartar } from '@/services/sincronizacao/operacoes';
import { avisar, escolherSaida } from '@/utils/alerta';

/**
 * Sair da conta respeitando a fila de sincronização.
 * Resolve `true` se saiu e `false` se o usuário cancelou ou ainda há pendências.
 */
export function useSair(): () => Promise<boolean> {
  const db = useSQLiteContext();
  const { user, sair } = useAuth();
  const { sincronizarAgora } = useSync();
  const fila = useMemo(() => new SqliteFilaRepository(db), [db]);

  return useCallback(async () => {
    if (!user) {
      await sair();
      return true;
    }

    const { pendentes, erros } = await fila.resumo(user.id);
    const total = pendentes + erros;

    if (total > 0) {
      const quantidade = total === 1 ? '1 alteração' : `${total} alterações`;
      const escolha = await escolherSaida(
        'Alterações pendentes',
        `Você tem ${quantidade} que ainda não foram enviadas ao servidor.`,
      );

      if (escolha === 'cancelar') return false;

      if (escolha === 'sincronizar') {
        await sincronizarAgora();
        const depois = await fila.resumo(user.id);
        if (depois.pendentes + depois.erros > 0) {
          avisar(
            'Ainda há pendências',
            'Não foi possível enviar tudo. Verifique a conexão e tente de novo, ou escolha sair e descartar.',
          );
          return false;
        }
      } else {
        const itens = await fila.listar(user.id);
        await fila.descartarDoUsuario(user.id);
        for (const item of itens) {
          try {
            await buscarAoDescartar(item.operacao)?.(item.payload, {
              db,
              usuarioId: item.usuarioId,
            });
          } catch (e) {
            console.warn('Erro ao desfazer item descartado:', e);
          }
        }
      }
    }

    await sair();
    return true;
  }, [db, fila, sair, sincronizarAgora, user]);
}
