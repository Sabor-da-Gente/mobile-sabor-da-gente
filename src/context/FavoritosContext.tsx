import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { useFavoritoRepository } from '@/hooks/use-repositorios';
import type { AlvoFavorito, Favorito } from '@/repositories/FavoritoRepository';

type FavoritosContextType = {
  favoritos: Favorito[];
  carregando: boolean;
  ehFavorito: (alvo: AlvoFavorito) => boolean;
  alternar: (alvo: AlvoFavorito) => Promise<void>;
};

const FavoritosContext = createContext<FavoritosContextType | undefined>(undefined);

/** Favoritos compartilhados: o coração fica igual em todas as telas. */
export function FavoritosProvider({ children }: { children: ReactNode }) {
  const repo = useFavoritoRepository();
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    repo
      .listar()
      .then((lista) => ativo && setFavoritos(lista))
      .catch((erro) => console.error('Erro ao carregar favoritos:', erro))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [repo]);

  const ehFavorito = useCallback(
    ({ tipo, id }: AlvoFavorito) => favoritos.some((f) => f.tipo === tipo && f.id === id),
    [favoritos],
  );

  const alternar = useCallback(
    async (alvo: AlvoFavorito) => {
      try {
        await repo.alternar(alvo);
        setFavoritos(await repo.listar());
      } catch (erro) {
        console.error('Erro ao favoritar:', erro);
      }
    },
    [repo],
  );

  return (
    <FavoritosContext.Provider value={{ favoritos, carregando, ehFavorito, alternar }}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritos() {
  const contexto = useContext(FavoritosContext);

  if (!contexto) {
    throw new Error('useFavoritos deve ser usado dentro de FavoritosProvider.');
  }

  return contexto;
}
