import { useSyncExternalStore } from 'react';

import { onlineAgora, ouvirConexao } from '@/services/conexao';

export function useConexao(): { online: boolean } {
  const online = useSyncExternalStore(ouvirConexao, onlineAgora, onlineAgora);
  return { online };
}
