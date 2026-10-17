import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  carregando: boolean;
  sair: () => Promise<void>;
  atualizarSessao: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizarSessao = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    setSession(data.session);
  }, []);

  useEffect(() => {
    let ativo = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao recuperar sessão:', error);
          return;
        }

        if (ativo) {
          setSession(data.session);
        }
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      if (ativo) {
        setSession(novaSessao);
      }
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  const sair = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        carregando,
        sair,
        atualizarSessao,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return contexto;
}
