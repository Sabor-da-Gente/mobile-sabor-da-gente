export type CategoriaId = 'pizzas' | 'esfihas' | 'bebidas' | 'sobremesas';

export type Categoria = {
  id: CategoriaId;
  titulo: string;
  emoji: string;
  descricao: string;
  subtitulo: string;
  maxSabores: number;
  nomeItem?: string;
};

export type Produto = {
  id: string;
  categoriaId: CategoriaId;
  nome: string;
  descricao: string;
  emoji: string;
  precoCentavos: number;
  disponivel: boolean;
};