import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type ItemCarrinho = {
  id: string;
  nome: string;
  sabores: string[];
  precoCentavos: number;
  quantidade: number;
};

type CarrinhoContextType = {
  itens: ItemCarrinho[];
  carregando: boolean;
  adicionarItem: (item: Omit<ItemCarrinho, 'id' | 'quantidade'>) => void;
  aumentarQuantidade: (id: string) => void;
  diminuirQuantidade: (id: string) => void;
  removerItem: (id: string) => void;
  limparCarrinho: () => void;
  total: number;
};

const CHAVE_CARRINHO = '@sabor-da-gente:carrinho:v2';

const CarrinhoContext = createContext<CarrinhoContextType | undefined>(
  undefined
);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarCarrinho() {
      try {
        const dados = await AsyncStorage.getItem(CHAVE_CARRINHO);

        if (dados) {
          setItens(JSON.parse(dados));
        }
      } catch (erro) {
        console.error('Erro ao carregar o carrinho:', erro);
      } finally {
        setCarregando(false);
      }
    }

    carregarCarrinho();
  }, []);

  useEffect(() => {
    if (carregando) return;

    AsyncStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens)).catch(
      (erro) => console.error('Erro ao salvar o carrinho:', erro)
    );
  }, [itens, carregando]);

  const adicionarItem = useCallback(
    (item: Omit<ItemCarrinho, 'id' | 'quantidade'>) => {
      setItens((atuais) => [
        ...atuais,
        {
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          quantidade: 1,
        },
      ]);
    },
    []
  );

  const aumentarQuantidade = useCallback((id: string) => {
    setItens((atuais) =>
      atuais.map((item) =>
        item.id === id
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      )
    );
  }, []);

  const diminuirQuantidade = useCallback((id: string) => {
    setItens((atuais) =>
      atuais
        .map((item) =>
          item.id === id
            ? { ...item, quantidade: item.quantidade - 1 }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }, []);

  const removerItem = useCallback((id: string) => {
    setItens((atuais) => atuais.filter((item) => item.id !== id));
  }, []);

  const limparCarrinho = useCallback(() => {
    setItens([]);
  }, []);

  const total = itens.reduce(
    (soma, item) => soma + item.precoCentavos * item.quantidade,
    0
  );

  return (
    <CarrinhoContext.Provider
      value={{
        itens,
        carregando,
        adicionarItem,
        aumentarQuantidade,
        diminuirQuantidade,
        removerItem,
        limparCarrinho,
        total,
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