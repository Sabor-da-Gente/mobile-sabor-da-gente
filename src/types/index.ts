export type CategoriaId = string;

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
  | 'realizado'
  | 'em_preparacao'
  | 'saiu_para_entrega'
  | 'pronto_para_retirada'
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
  totalCentavos: number;
  status: StatusPedido;
  criadoEm: string;
};

export type NovoPedido = Omit<Pedido, 'id' | 'numero' | 'status' | 'criadoEm'>;
