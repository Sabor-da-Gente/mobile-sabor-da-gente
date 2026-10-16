export type TipoCategoria = 'pizza' | 'produtos';

export type CategoriaRow = {
  id: number;
  nome: string;
  slug: string;
  tipo: TipoCategoria;
  icone: string | null;
  ordem: number;
};

export class Categoria {
  constructor(
    readonly id: number,
    readonly nome: string,
    readonly slug: string,
    readonly tipo: TipoCategoria,
    readonly icone: string,
    readonly ordem: number,
  ) {}

  get ehPizza(): boolean {
    return this.tipo === 'pizza';
  }

  static fromRow(row: CategoriaRow): Categoria {
    return new Categoria(row.id, row.nome, row.slug, row.tipo, row.icone ?? '🍽️', row.ordem);
  }
}
