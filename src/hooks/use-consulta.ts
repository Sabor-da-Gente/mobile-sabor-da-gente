import { useEffect, useState } from 'react';

export type EstadoConsulta<T> = {
  dados: T | undefined;
  carregando: boolean;
  erro: Error | undefined;
};

/** Passe uma função estável (useCallback): ela roda de novo sempre que mudar. */
export function useConsulta<T>(consulta: () => Promise<T>): EstadoConsulta<T> {
  const [estado, setEstado] = useState<EstadoConsulta<T>>({
    dados: undefined,
    carregando: true,
    erro: undefined,
  });

  useEffect(() => {
    let ativo = true;
    consulta().then(
      (dados) => {
        if (ativo) setEstado({ dados, carregando: false, erro: undefined });
      },
      (erro: unknown) => {
        if (ativo) {
          setEstado({
            dados: undefined,
            carregando: false,
            erro: erro instanceof Error ? erro : new Error(String(erro)),
          });
        }
      },
    );
    return () => {
      ativo = false;
    };
  }, [consulta]);

  return estado;
}
