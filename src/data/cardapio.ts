import type { Categoria, Produto } from '@/types';

export const CATEGORIAS: Categoria[] = [
  {
    id: 'pizzas',
    titulo: 'Pizzas',
    emoji: '🍕',
    descricao: 'Pizzas grandes e deliciosas',
    subtitulo: 'Escolha 1 ou 2 sabores',
    maxSabores: 2,
    nomeItem: 'Pizza Grande',
  },
  {
    id: 'esfihas',
    titulo: 'Esfihas',
    emoji: '🥟',
    descricao: 'Esfihas para todos os gostos',
    subtitulo: 'Escolha seu sabor favorito',
    maxSabores: 1,
  },
  {
    id: 'bebidas',
    titulo: 'Bebidas',
    emoji: '🥤',
    descricao: 'Refrigerantes e outras bebidas',
    subtitulo: 'Escolha uma bebida para acompanhar seu pedido',
    maxSabores: 1,
  },
  {
    id: 'sobremesas',
    titulo: 'Sobremesas',
    emoji: '🍫',
    descricao: 'Para finalizar o pedido',
    subtitulo: 'Um docinho para fechar bem',
    maxSabores: 1,
  },
];

export const PRODUTOS: Produto[] = [
  { id: 'pizza-calabresa', categoriaId: 'pizzas', nome: 'Calabresa', descricao: 'Molho de tomate, queijo, calabresa e cebola.', emoji: '🍕', precoCentavos: 4500, disponivel: true },
  { id: 'pizza-frango-catupiry', categoriaId: 'pizzas', nome: 'Frango com Catupiry', descricao: 'Molho de tomate, queijo, frango e catupiry.', emoji: '🍕', precoCentavos: 4500, disponivel: true },
  { id: 'pizza-portuguesa', categoriaId: 'pizzas', nome: 'Portuguesa', descricao: 'Queijo, presunto, ovo, cebola, tomate e azeitona.', emoji: '🍕', precoCentavos: 4800, disponivel: true },

  { id: 'esfiha-carne', categoriaId: 'esfihas', nome: 'Esfiha de Carne', descricao: 'Esfiha saborosa com recheio de carne.', emoji: '🥟', precoCentavos: 400, disponivel: true },
  { id: 'esfiha-frango', categoriaId: 'esfihas', nome: 'Esfiha de Frango', descricao: 'Esfiha recheada com frango temperado.', emoji: '🍗', precoCentavos: 400, disponivel: true },
  { id: 'esfiha-queijo', categoriaId: 'esfihas', nome: 'Esfiha de Queijo', descricao: 'Esfiha com recheio cremoso de queijo.', emoji: '🧀', precoCentavos: 400, disponivel: true },
  { id: 'esfiha-calabresa', categoriaId: 'esfihas', nome: 'Esfiha de Calabresa', descricao: 'Esfiha com calabresa bem temperada.', emoji: '🍕', precoCentavos: 400, disponivel: true },

  { id: 'bebida-coca-2l', categoriaId: 'bebidas', nome: 'Coca-Cola 2 litros', descricao: 'Refrigerante Coca-Cola para compartilhar.', emoji: '🥤', precoCentavos: 1500, disponivel: true },
  { id: 'bebida-guarana-1l', categoriaId: 'bebidas', nome: 'Guaraná 1 litro', descricao: 'Refrigerante de guaraná, ideal para acompanhar seu pedido.', emoji: '🥤', precoCentavos: 800, disponivel: true },
  { id: 'bebida-refri-pequeno', categoriaId: 'bebidas', nome: 'Refrigerante pequeno', descricao: 'Refrigerante em embalagem pequena.', emoji: '🧃', precoCentavos: 400, disponivel: true },

  { id: 'sobremesa-brigadeiro', categoriaId: 'sobremesas', nome: 'Brigadeiro', descricao: 'Doce de chocolate coberto com granulado.', emoji: '🍫', precoCentavos: 300, disponivel: true },
  { id: 'sobremesa-pudim', categoriaId: 'sobremesas', nome: 'Pudim', descricao: 'Pudim de leite condensado com calda de caramelo.', emoji: '🍮', precoCentavos: 600, disponivel: true },
  { id: 'sobremesa-mousse', categoriaId: 'sobremesas', nome: 'Mousse de chocolate', descricao: 'Sobremesa cremosa e deliciosa de chocolate.', emoji: '🍨', precoCentavos: 500, disponivel: true },
];