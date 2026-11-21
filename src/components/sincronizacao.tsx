import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';

import { iniciarSincronizador } from '@/services/sincronizacao/iniciarSincronizador';

export function Sincronizacao() {
  const db = useSQLiteContext();
  useEffect(() => iniciarSincronizador(db).encerrar, [db]);
  return null;
}
