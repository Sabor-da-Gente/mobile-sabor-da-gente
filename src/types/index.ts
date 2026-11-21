export type CategoriaId = string;

export type Categoria = {
  id: CategoriaId;
  titulo: string;
  emoji: string;
  descricao: string;
  subtitulo: string;
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
  | 'pronto_para_retirada'
  | 'entregue'
  | 'cancelado';

export type EventoStatus = { status: StatusPedido; em: string };

export type TipoEntrega = 'entrega' | 'retirada';

export type FormaPagamento = 'Pix' | 'Dinheiro' | 'Cartão';

export type ItemPedido = {
  nome: string;
  sabores: string[];
  adicionais: string[];
  observacao: string | null;
  precoCentavos: number;
  quantidade: number;
};

export type Pedido = {
  id: number;
  numero: string;
  clienteNome: string;
  telefone: string;
  tipoEntrega: TipoEntrega;
  enderecoId: number | null;
  endereco: string;
  pagamento: FormaPagamento;
  trocoParaCentavos: number | null;
  itens: ItemPedido[];
  subtotalCentavos: number;
  taxaEntregaCentavos: number;
  totalCentavos: number;
  status: StatusPedido;
  historico: EventoStatus[];
  criadoEm: string;
  sincronizado: boolean;
};

export type NovoPedido = Omit<
  Pedido,
  'id' | 'numero' | 'status' | 'historico' | 'criadoEm' | 'itens' | 'sincronizado'
>;
