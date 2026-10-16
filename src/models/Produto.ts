export type ProdutoRow = {
  id: number;
  categoria_id: number;
  nome: string;
  descricao: string | null;
  ingredientes: string | null;
  imagem_url: string | null;
  preco: number;
  destaque: number;
};

export class Produto {
  constructor(
    readonly id: number,
    readonly categoriaId: number,
    readonly nome: string,
    readonly descricao: string,
    readonly ingredientes: string | null,
    readonly imagemUrl: string | null,
    /** Preço em centavos. */
    readonly preco: number,
    readonly destaque: boolean,
  ) {}

  static fromRow(row: ProdutoRow): Produto {
    return new Produto(
      row.id,
      row.categoria_id,
      row.nome,
      row.descricao ?? '',
      row.ingredientes,
      row.imagem_url,
      row.preco,
      row.destaque === 1,
    );
  }
}
