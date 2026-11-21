import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import { useConexao } from '@/hooks/use-conexao';
import type { ItemFila } from '@/repositories/FilaRepository';
import { SqliteFilaRepository } from '@/repositories/sqlite/SqliteFilaRepository';
import { ouvirFila } from '@/services/sincronizacao/eventos';
import { iniciarSincronizador } from '@/services/sincronizacao/iniciarSincronizador';
import { buscarAoDescartar } from '@/services/sincronizacao/operacoes';
import type {
  ResultadoSincronizacao,
  SincronizadorService,
} from '@/services/sincronizacao/SincronizadorService';

type SyncContextType = {
  online: boolean;
  pendentes: number;
  erros: number;
  versao: number;
  sincronizarAgora: () => Promise<ResultadoSincronizacao>;
  listarFila: () => Promise<ItemFila[]>;
  reenviar: (id: number) => Promise<void>;
  descartar: (id: number) => Promise<void>;
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const usuarioId = user?.id ?? null;
  const { online } = useConexao();

  const fila = useMemo(() => new SqliteFilaRepository(db), [db]);
  const sincronizador = useRef<SincronizadorService | null>(null);
  const [resumo, setResumo] = useState({ pendentes: 0, erros: 0 });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const { sincronizador: instancia, encerrar } = iniciarSincronizador(db);
    sincronizador.current = instancia;
    return () => {
      sincronizador.current = null;
      encerrar();
    };
  }, [db]);

  useEffect(() => {
    let ativo = true;
    const atualizar = () => {
      setVersao((v) => v + 1);
      if (!usuarioId) {
        setResumo({ pendentes: 0, erros: 0 });
        return;
      }
      fila
        .resumo(usuarioId)
        .then((r) => ativo && setResumo(r))
        .catch((e) => console.error('Erro ao ler a fila:', e));
    };
    atualizar();
    const cancelar = ouvirFila(atualizar);
    return () => {
      ativo = false;
      cancelar();
    };
  }, [fila, usuarioId]);

  const sincronizarAgora = useCallback(async (): Promise<ResultadoSincronizacao> => {
    return sincronizador.current ? sincronizador.current.agora() : 'interrompida';
  }, []);

  const listarFila = useCallback(
    async () => (usuarioId ? fila.listar(usuarioId) : []),
    [fila, usuarioId],
  );
  const reenviar = useCallback((id: number) => fila.reenviar(id), [fila]);
  const descartar = useCallback(
    async (id: number) => {
      const item = usuarioId ? (await fila.listar(usuarioId)).find((i) => i.id === id) : undefined;
      if (!item || item.status === 'enviando') return;
      await fila.descartar(id);
      await buscarAoDescartar(item.operacao)?.(item.payload, { db, usuarioId: item.usuarioId });
    },
    [db, fila, usuarioId],
  );

  const valor = useMemo(
    () => ({ online, ...resumo, versao, sincronizarAgora, listarFila, reenviar, descartar }),
    [online, resumo, versao, sincronizarAgora, listarFila, reenviar, descartar],
  );

  return <SyncContext.Provider value={valor}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextType {
  const contexto = useContext(SyncContext);
  if (!contexto) throw new Error('useSync precisa estar dentro de SyncProvider.');
  return contexto;
}
