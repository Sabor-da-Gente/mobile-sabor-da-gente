import type { ItemCarrinho } from '@/models/ItemCarrinho';

export const QUANTIDADE_MAXIMA = 50;

export type NovoItemCarrinho =
  | { tipo: 'produto'; produtoId: number; observacao?: string }
  | {
      tipo: 'pizza';
      tamanhoId: number;
      massaId: number;
      saborIds: number[];
      adicionalIds: number[];
      observacao?: string;
    };

/** Hoje SQLite; o carrinho fica no aparelho mesmo quando houver API. */
export interface CarrinhoRepository {
  listar(): Promise<ItemCarrinho[]>;
  /** Regra R3: item igual ao que já está no carrinho soma a quantidade. */
  adicionar(item: NovoItemCarrinho, quantidade?: number): Promise<void>;
  /** Quantidade 0 remove o item; acima do máximo fica no máximo. */
  alterarQuantidade(id: number, quantidade: number): Promise<void>;
  remover(id: number): Promise<void>;
  limpar(): Promise<void>;
}
