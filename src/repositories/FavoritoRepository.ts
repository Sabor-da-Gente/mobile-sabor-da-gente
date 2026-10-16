/** O que pode ser favoritado: um produto (esfiha, bebida...) ou um sabor de pizza. */
export type AlvoFavorito = { tipo: 'produto' | 'sabor'; id: number };

export type Favorito =
  | {
      tipo: 'produto';
      id: number;
      nome: string;
      descricao: string;
      /** Centavos. */
      preco: number;
      categoriaSlug: string;
      icone: string;
    }
  | {
      tipo: 'sabor';
      id: number;
      nome: string;
      descricao: string;
      /** Menor preço entre os tamanhos, em centavos. */
      aPartirDe: number | null;
    };

export interface FavoritoRepository {
  /** Mais recentes primeiro; itens que saíram do cardápio não aparecem. */
  listar(): Promise<Favorito[]>;
  /** Liga ou desliga o favorito e devolve o novo estado. */
  alternar(alvo: AlvoFavorito): Promise<boolean>;
}
