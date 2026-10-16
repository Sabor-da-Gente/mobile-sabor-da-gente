import { useCallback } from 'react';

import { useConsulta } from '@/hooks/use-consulta';
import { useCardapioRepository } from '@/hooks/use-repositorios';
import { carregarCategoria } from '@/services/cardapioService';

export function useProdutos(categoriaId: string | undefined) {
  const repo = useCardapioRepository();

  const carregar = useCallback(async () => {
    if (!categoriaId) return null;
    try {
      return await carregarCategoria(repo, categoriaId);
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
      throw e;
    }
  }, [repo, categoriaId]);

  const { dados, carregando, erro, recarregar } = useConsulta(carregar);

  return {
    categoria: dados?.categoria,
    produtos: dados?.produtos ?? [],
    carregando,
    erro: erro ? 'Não foi possível carregar o cardápio. Tente novamente.' : null,
    recarregar,
  };
}
