import { useCallback, useEffect, useState } from 'react';

import { listarProdutos } from '@/services/cardapioService';
import type { Produto } from '@/types';

export function useProdutos(categoriaId: string | undefined) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!categoriaId) {
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      setProdutos(await listarProdutos(categoriaId));
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
      setErro('Não foi possível carregar o cardápio. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, [categoriaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { produtos, carregando, erro, recarregar: carregar };
}