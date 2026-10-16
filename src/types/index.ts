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

export type StatusPedido =
  | 'recebido'
  | 'em_preparo'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'cancelado';

export type TipoEntrega = 'entrega' | 'retirada';

export type FormaPagamento = 'Pix' | 'Dinheiro' | 'Cartão';

export type ItemPedido = {
  nome: string;
  sabores: string[];
  precoCentavos: number;
  quantidade: number;
};

export type Pedido = {
  id: string;
  numero: string;
  clienteNome: string;
  telefone: string;
  tipoEntrega: TipoEntrega;
  endereco: string;
  pagamento: FormaPagamento;
  trocoPara: string;
  itens: ItemPedido[];
  totalCentavos: number;
  status: StatusPedido;
  criadoEm: string;
  atualizadoEm: string;
};

export type NovoPedido = Omit<
  Pedido,
  'id' | 'numero' | 'status' | 'criadoEm' | 'atualizadoEm'
>;