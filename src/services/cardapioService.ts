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

  if (cat.ehPizza) {
    // Por enquanto só o maior tamanho; tamanho, massa e adicionais entram na Etapa 2.
    const { tamanhos, sabores } = await repo.buscarOpcoesPizza();
    const tamanho = tamanhos.at(-1);
    if (!tamanho) return null;
    return {
      categoria: {
        id: cat.slug,
        titulo: cat.nome,
        emoji: cat.icone,
        descricao: '',
        subtitulo: `Escolha de 1 a ${tamanho.maxSabores} sabores`,
        maxSabores: tamanho.maxSabores,
        nomeItem: `Pizza ${tamanho.nome}`,
      },
      produtos: sabores.map((s) => ({
        id: `sabor-${s.id}`,
        categoriaId: cat.slug,
        nome: s.nome,
        descricao: s.descricao,
        emoji: cat.icone,
        precoCentavos: s.precoNoTamanho(tamanho.id) ?? 0,
        disponivel: s.disponivelNo(tamanho.id),
      })),
    };
  }

  const produtos = await repo.listarProdutos({ categoriaSlug: slug });
  return {
    categoria: {
      id: cat.slug,
      titulo: cat.nome,
      emoji: cat.icone,
      descricao: '',
      subtitulo: 'Escolha seu favorito',
      maxSabores: 1,
    },
    produtos: produtos.map((p) => ({
      id: `produto-${p.id}`,
      categoriaId: cat.slug,
      nome: p.nome,
      descricao: p.descricao,
      emoji: cat.icone,
      precoCentavos: p.preco,
      disponivel: true,
    })),
  };
}
