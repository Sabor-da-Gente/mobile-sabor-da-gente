import { ItemPizza, ItemProduto, type ItemCarrinho } from '@/models/ItemCarrinho';
import type { CarrinhoRepository } from '@/repositories/CarrinhoRepository';
import type { PedidoRepository } from '@/repositories/PedidoRepository';
import { supabase } from '@/services/supabase';
import type {
  EventoStatus,
  FormaPagamento,
  ItemPedido,
  NovoPedido,
  Pedido,
  StatusPedido,
  TipoEntrega,
} from '@/types';

import { erroAmigavel, exigirUsuario, usuarioAtual } from './util';

const PAGAMENTO_PARA_BANCO: Record<FormaPagamento, string> = {
  Pix: 'pix',
  Dinheiro: 'dinheiro',
  Cartão: 'cartao',
};

const PAGAMENTO_DO_BANCO: Record<string, FormaPagamento> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
};

const SELECT =
  'id, numero, cliente_nome, cliente_telefone, tipo_entrega, endereco_id, endereco_entrega, ' +
  'forma_pagamento, troco_para, subtotal, taxa_entrega, total, status, criado_em, ' +
  'itens_pedido(id, tipo, nome, sabores, quantidade, preco_unitario, observacao, itens_pedido_adicionais(nome)), ' +
  'pedido_status_historico(id, status, criado_em)';

type LinhaItem = {
  id: number;
  tipo: string | null;
  nome: string;
  sabores: string[] | null;
  quantidade: number;
  preco_unitario: number;
  observacao: string | null;
  itens_pedido_adicionais: { nome: string }[] | null;
};

type LinhaHistorico = { id: number; status: StatusPedido; criado_em: string };

type LinhaPedido = {
  id: string;
  numero: number;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_entrega: TipoEntrega;
  endereco_id: number | null;
  endereco_entrega: string | null;
  forma_pagamento: string;
  troco_para: number | null;
  subtotal: number | null;
  taxa_entrega: number | null;
  total: number;
  status: StatusPedido;
  criado_em: string;
  itens_pedido: LinhaItem[] | null;
  pedido_status_historico: LinhaHistorico[] | null;
};

/** Formato que a função criar_pedido do banco espera. */
function paraItemRpc(item: ItemCarrinho) {
  const observacao = item.observacao ?? undefined;

  if (item instanceof ItemPizza) {
    return {
      tipo: 'pizza',
      tamanhoId: item.tamanho.id,
      massaId: item.massa.id,
      saborIds: item.saboresEscolhidos.map((s) => s.id),
      adicionalIds: item.adicionais.map((a) => a.id),
      quantidade: item.quantidade,
      observacao,
    };
  }
  if (item instanceof ItemProduto) {
    return { tipo: 'produto', produtoId: item.produto.id, quantidade: item.quantidade, observacao };
  }
  throw new Error('Tipo de item desconhecido.');
}

function paraPedido(linha: LinhaPedido): Pedido {
  const itens: ItemPedido[] = [...(linha.itens_pedido ?? [])]
    .sort((a, b) => a.id - b.id)
    .map((i) => ({
      // No banco o nome da pizza já traz os adicionais ("Pizza Grande (Tradicional) + Bacon").
      nome: i.tipo === 'pizza' ? i.nome.split(' + ')[0] : i.nome,
      sabores: i.sabores ?? [],
      adicionais: (i.itens_pedido_adicionais ?? []).map((a) => a.nome),
      observacao: i.observacao,
      precoCentavos: i.preco_unitario,
      quantidade: i.quantidade,
    }));

  const historico: EventoStatus[] = [...(linha.pedido_status_historico ?? [])]
    .sort((a, b) => a.id - b.id)
    .map((h) => ({ status: h.status, em: h.criado_em }));

  const taxa = linha.taxa_entrega ?? 0;

  return {
    // O número do pedido é o identificador usado pelo app (único no banco).
    id: linha.numero,
    numero: String(linha.numero),
    clienteNome: linha.cliente_nome,
    telefone: linha.cliente_telefone,
    tipoEntrega: linha.tipo_entrega,
    enderecoId: linha.endereco_id,
    endereco: linha.endereco_entrega ?? '',
    pagamento: PAGAMENTO_DO_BANCO[linha.forma_pagamento] ?? 'Pix',
    trocoParaCentavos: linha.troco_para,
    itens,
    subtotalCentavos: linha.subtotal ?? linha.total - taxa,
    taxaEntregaCentavos: taxa,
    totalCentavos: linha.total,
    status: linha.status,
    historico,
    criadoEm: linha.criado_em,
  };
}

/** Pedidos gravados no Supabase pela função criar_pedido; o status é mudado pela pizzaria. */
export class SupabasePedidoRepository implements PedidoRepository {
  /** O carrinho continua no celular; é esvaziado depois que o pedido é aceito. */
  constructor(private readonly carrinho: CarrinhoRepository) {}

  async criar(novo: NovoPedido, itens: ItemCarrinho[]): Promise<Pedido> {
    const usuario = await exigirUsuario('Entre na sua conta para fazer o pedido.');
    await this.atualizarPerfil(usuario.id, novo);

    const { data, error } = await supabase.rpc('criar_pedido', {
      p_itens: itens.map(paraItemRpc),
      p_tipo_entrega: novo.tipoEntrega,
      p_forma_pagamento: PAGAMENTO_PARA_BANCO[novo.pagamento],
      p_endereco_id: novo.tipoEntrega === 'entrega' ? novo.enderecoId : null,
      p_troco_para: novo.trocoParaCentavos,
      p_cupom: null,
      p_observacao: null,
    });
    if (error) throw erroAmigavel(error);

    // Daqui para a frente o pedido já existe: nada pode lançar erro e induzir um segundo pedido.
    await this.carrinho.limpar().catch((e) => console.error('Erro ao esvaziar o carrinho:', e));

    const numero = (data as { numero: number }).numero;
    const pedido = await this.buscar(numero).catch(() => null);
    if (pedido) return pedido;

    const agora = new Date().toISOString();
    return {
      ...novo,
      id: numero,
      numero: String(numero),
      itens: [],
      status: 'recebido',
      historico: [{ status: 'recebido', em: agora }],
      criadoEm: agora,
    };
  }

  async listar(): Promise<Pedido[]> {
    const usuario = await usuarioAtual();
    if (!usuario) return [];

    const { data, error } = await supabase
      .from('pedidos')
      .select(SELECT)
      .eq('cliente_id', usuario.id)
      .order('criado_em', { ascending: false });
    if (error) throw erroAmigavel(error);
    return (data as unknown as LinhaPedido[]).map(paraPedido);
  }

  async buscar(id: number): Promise<Pedido | null> {
    const usuario = await usuarioAtual();
    if (!usuario) return null;

    const { data, error } = await supabase
      .from('pedidos')
      .select(SELECT)
      .eq('cliente_id', usuario.id)
      .eq('numero', id)
      .maybeSingle();
    if (error) throw erroAmigavel(error);
    return data ? paraPedido(data as unknown as LinhaPedido) : null;
  }

  /** Quem muda o status é a pizzaria (painel Web); o app não grava status. */
  async registrarStatus(): Promise<boolean> {
    return false;
  }

  async cancelar(id: number): Promise<boolean> {
    const usuario = await usuarioAtual();
    if (!usuario) return false;

    const { data: pedido, error: erroBusca } = await supabase
      .from('pedidos')
      .select('id')
      .eq('cliente_id', usuario.id)
      .eq('numero', id)
      .maybeSingle();
    if (erroBusca) throw erroAmigavel(erroBusca);
    if (!pedido) return false;

    const { error } = await supabase.rpc('cancelar_pedido', { p_pedido_id: pedido.id });
    if (error) {
      if (error.hint === 'TRANSICAO_INVALIDA' || error.hint === 'NAO_ENCONTRADO') return false;
      throw erroAmigavel(error);
    }
    return true;
  }

  async excluir(): Promise<void> {
    throw new Error('Pedidos enviados à pizzaria não podem ser apagados do histórico.');
  }

  private async atualizarPerfil(usuarioId: string, novo: NovoPedido): Promise<void> {
    const { data } = await supabase
      .from('perfis')
      .select('nome, telefone')
      .eq('id', usuarioId)
      .maybeSingle();
    if (data && data.nome === novo.clienteNome && data.telefone === novo.telefone) return;

    const { error } = await supabase
      .from('perfis')
      .update({ nome: novo.clienteNome, telefone: novo.telefone })
      .eq('id', usuarioId);
    if (error) throw erroAmigavel(error);
  }
}
