import { useCallback } from 'react';

import { useConsulta } from '@/hooks/use-consulta';
import { useCardapioRepository } from '@/hooks/use-repositorios';
import { TAXA_ENTREGA_CENTAVOS } from '@/services/PrecoService';

export function useTaxaEntrega(): number {
  const repo = useCardapioRepository();
  const carregar = useCallback(() => repo.buscarTaxaEntrega(), [repo]);
  const { dados } = useConsulta(carregar);
  return dados ?? TAXA_ENTREGA_CENTAVOS;
}