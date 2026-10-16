import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoConsulta<T> = {
  dados: T | undefined;
  carregando: boolean;
  erro: Error | undefined;
};

/** Passe uma função estável (useCallback): ela roda de novo sempre que mudar. */
export function useConsulta<T>(consulta: () => Promise<T>): EstadoConsulta<T> & { recarregar: () => void } {
  const [estado, setEstado] = useState<EstadoConsulta<T>>({
    dados: undefined,
    carregando: true,
    erro: undefined,
  });
  const [tentativa, setTentativa] = useState(0);

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
  }, [consulta, tentativa]);

  // Mantém os dados atuais na tela enquanto busca de novo.
  const recarregar = useCallback(() => {
    setEstado((atual) => ({ ...atual, carregando: true, erro: undefined }));
    setTentativa((t) => t + 1);
  }, []);

  return { ...estado, recarregar };
}

/** Como `useConsulta`, mas busca de novo sempre que a tela volta a ficar visível. */
export function useConsultaAoFocar<T>(consulta: () => Promise<T>) {
  const estado = useConsulta(consulta);
  const { recarregar } = estado;
  const primeiraVez = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (primeiraVez.current) {
        primeiraVez.current = false;
        return;
      }
      recarregar();
    }, [recarregar]),
  );

  return estado;
}
