export type CategoriaId = string;

export type Categoria = {
  id: CategoriaId;
  titulo: string;
  emoji: string;
  descricao: string;
  subtitulo: string;
  /** Pizza abre o "Monte sua pizza" em vez da lista de produtos. */
  ehPizza: boolean;
};

export type Produto = {
  id: number;
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
  id: number;
  numero: string;
  clienteNome: string;
  telefone: string;
  tipoEntrega: TipoEntrega;
  endereco: string;
  pagamento: FormaPagamento;
  trocoParaCentavos: number | null;
  itens: ItemPedido[];
  subtotalCentavos: number;
  taxaEntregaCentavos: number;
  totalCentavos: number;
  status: StatusPedido;
  criadoEm: string;
};

export type NovoPedido = Omit<Pedido, 'id' | 'numero' | 'status' | 'criadoEm'>;
