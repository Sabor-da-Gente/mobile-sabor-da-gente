import type { Categoria } from '@/models/Categoria';
import type { OpcoesPizza, Sabor } from '@/models/Pizza';
import type { Produto } from '@/models/Produto';

export type FiltroProdutos = {
  categoriaSlug?: string;
  somenteDestaques?: boolean;
};

/** As telas só conhecem esta interface; hoje SQLite, depois a API. */
export interface CardapioRepository {
  listarCategorias(): Promise<Categoria[]>;
  buscarCategoria(slug: string): Promise<Categoria | null>;
  listarProdutos(filtro?: FiltroProdutos): Promise<Produto[]>;
  buscarOpcoesPizza(): Promise<OpcoesPizza>;
  listarDestaques(): Promise<{ produtos: Produto[]; sabores: Sabor[] }>;
}
