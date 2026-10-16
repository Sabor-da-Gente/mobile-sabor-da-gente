import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useCarrinhoRepository } from '@/hooks/use-repositorios';
import type { ItemCarrinho } from '@/models/ItemCarrinho';
import type { NovoItemCarrinho } from '@/repositories/CarrinhoRepository';

type CarrinhoContextType = {
  itens: ItemCarrinho[];
  carregando: boolean;
  quantidadeTotal: number;
  /** Soma dos itens, sem a taxa de entrega. */
  subtotal: number;
  adicionar: (item: NovoItemCarrinho) => Promise<void>;
  aumentarQuantidade: (id: number) => Promise<void>;
  diminuirQuantidade: (id: number) => Promise<void>;
  removerItem: (id: number) => Promise<void>;
  limparCarrinho: () => Promise<void>;
  /** Relê o banco (ex.: depois que o pedido esvaziou o carrinho). */
  recarregar: () => Promise<void>;
};

const CarrinhoContext = createContext<CarrinhoContextType | undefined>(undefined);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const repo = useCarrinhoRepository();
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [carregando, setCarregando] = useState(true);
  // Uma operação por vez: toques rápidos em "+" não disputam o banco.
  const fila = useRef<Promise<void>>(Promise.resolve());
  const atuais = useRef<ItemCarrinho[]>([]);

  const executar = useCallback(
    (operacao: () => Promise<void>) => {
      const proxima = fila.current.then(async () => {
        try {
          await operacao();
        } finally {
          atuais.current = await repo.listar();
          setItens(atuais.current);
          setCarregando(false);
        }
      });
      fila.current = proxima.catch((erro) => console.error('Erro no carrinho:', erro));
      return proxima;
    },
    [repo],
  );

  useEffect(() => {
    executar(async () => {});
  }, [executar]);

  const adicionar = useCallback(
    (item: NovoItemCarrinho) => executar(() => repo.adicionar(item)),
    [executar, repo],
  );

  const alterarEm = useCallback(
    (id: number, delta: number) =>
      executar(async () => {
        const item = atuais.current.find((i) => i.id === id);
        if (item) await repo.alterarQuantidade(id, item.quantidade + delta);
      }),
    [executar, repo],
  );

  const aumentarQuantidade = useCallback((id: number) => alterarEm(id, 1), [alterarEm]);
  const diminuirQuantidade = useCallback((id: number) => alterarEm(id, -1), [alterarEm]);

  const removerItem = useCallback(
    (id: number) => executar(() => repo.remover(id)),
    [executar, repo],
  );

  const limparCarrinho = useCallback(() => executar(() => repo.limpar()), [executar, repo]);
  const recarregar = useCallback(() => executar(async () => {}), [executar]);

  const quantidadeTotal = itens.reduce((soma, item) => soma + item.quantidade, 0);
  const subtotal = itens.reduce((soma, item) => soma + item.subtotal(), 0);

  return (
    <CarrinhoContext.Provider
      value={{
        itens,
        carregando,
        quantidadeTotal,
        subtotal,
        adicionar,
        aumentarQuantidade,
        diminuirQuantidade,
        removerItem,
        limparCarrinho,
        recarregar,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}

export function useCarrinho() {
  const contexto = useContext(CarrinhoContext);

  if (!contexto) {
    throw new Error('useCarrinho deve ser usado dentro de CarrinhoProvider.');
  }

  return contexto;
}
