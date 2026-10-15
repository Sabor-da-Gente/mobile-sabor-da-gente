import { CATEGORIAS, PRODUTOS } from '@/data/cardapio';
import type { Categoria, Produto } from '@/types';

export function listarCategorias(): Categoria[] {
  return CATEGORIAS;
}

export function buscarCategoria(id: string | undefined): Categoria | undefined {
  return CATEGORIAS.find((categoria) => categoria.id === id);
}

export async function listarProdutos(categoriaId: string): Promise<Produto[]> {
  return PRODUTOS.filter((produto) => produto.categoriaId === categoriaId);
}