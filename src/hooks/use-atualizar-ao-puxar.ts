import { useCallback, useEffect, useState } from 'react';

import { useSync } from '@/context/SyncContext';
import { ouvirDadosAtualizados } from '@/services/sincronizacao/eventos';

export function useAtualizarAoPuxar(recarregar: () => void) {
  const { sincronizarAgora } = useSync();
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => ouvirDadosAtualizados(recarregar), [recarregar]);

  const aoPuxar = useCallback(async () => {
    setAtualizando(true);
    try {
      await sincronizarAgora();
    } finally {
      setAtualizando(false);
      recarregar();
    }
  }, [sincronizarAgora, recarregar]);

  return { atualizando, aoPuxar };
}
