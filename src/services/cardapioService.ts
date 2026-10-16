import type { CardapioRepository } from '@/repositories/CardapioRepository';
import type { Categoria, Produto } from '@/types';

export type CategoriaComProdutos = { categoria: Categoria; produtos: Produto[] };

/** Converte o cardápio do banco para os tipos usados pela TelaCategoria. */
export async function carregarCategoria(
  repo: CardapioRepository,
  slug: string,
): Promise<CategoriaComProdutos | null> {
  const cat = await repo.buscarCategoria(slug);
  if (!cat) return null;

  const categoria: Categoria = {
    id: cat.slug,
    titulo: cat.nome,
    emoji: cat.icone,
    descricao: '',
    subtitulo: 'Escolha seu favorito',
    ehPizza: cat.ehPizza,
  };
  if (cat.ehPizza) return { categoria, produtos: [] };

  const produtos = await repo.listarProdutos({ categoriaSlug: slug });
  return {
    categoria,
    produtos: produtos.map((p) => ({
      id: p.id,
      categoriaId: cat.slug,
      nome: p.nome,
      descricao: p.descricao,
      emoji: cat.icone,
      precoCentavos: p.preco,
      disponivel: true,
    })),
  };
}
