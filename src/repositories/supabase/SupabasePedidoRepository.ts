import { ItemPizza, ItemProduto, type ItemCarrinho } from '@/models/ItemCarrinho';
import { supabase } from '@/services/supabase';
import type { FormaPagamento, ItemPedido, StatusPedido, TipoEntrega } from '@/types';

import { erroAmigavel } from './util';

export const PAGAMENTO_PARA_BANCO: Record<FormaPagamento, string> = {
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
  'id, numero, chave_cliente, cliente_nome, cliente_telefone, tipo_entrega, endereco_entrega, ' +
  'forma_pagamento, troco_para, subtotal, desconto, taxa_entrega, total, status, criado_em, ' +
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

type LinhaPedido = {
  id: string;
  numero: number;
  chave_cliente: string | null;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_entrega: TipoEntrega;
  endereco_entrega: string | null;
  forma_pagamento: string;
  troco_para: number | null;
  subtotal: number | null;
  desconto: number | null;
  taxa_entrega: number | null;
  total: number;
  status: StatusPedido;
  criado_em: string;
  itens_pedido: LinhaItem[] | null;
  pedido_status_historico: { id: number; status: StatusPedido; criado_em: string }[] | null;
};

export type ItemRemoto = ItemPedido & { tipo: 'produto' | 'pizza' };

export type PedidoRemoto = {
  idRemoto: string;
  numero: number;
  chaveCliente: string | null;
  clienteNome: string;
  telefone: string;
  tipoEntrega: TipoEntrega;
  endereco: string;
  pagamento: FormaPagamento;
  trocoParaCentavos: number | null;
  subtotalCentavos: number;
  descontoCentavos: number;
  taxaEntregaCentavos: number;
  totalCentavos: number;
  status: StatusPedido;
  criadoEm: string;
  itens: ItemRemoto[];
  historico: { idRemoto: number; status: StatusPedido; em: string }[];
};

export function paraIsoLocal(data: string): string {
  return new Date(data).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function paraItemRpc(item: ItemCarrinho) {
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

export type ItemRpc = ReturnType<typeof paraItemRpc>;

function paraRemoto(linha: LinhaPedido): PedidoRemoto {
  const taxa = linha.taxa_entrega ?? 0;
  const desconto = linha.desconto ?? 0;

  return {
    idRemoto: linha.id,
    numero: linha.numero,
    chaveCliente: linha.chave_cliente,
    clienteNome: linha.cliente_nome,
    telefone: linha.cliente_telefone,
    tipoEntrega: linha.tipo_entrega,
    endereco: linha.endereco_entrega ?? '',
    pagamento: PAGAMENTO_DO_BANCO[linha.forma_pagamento] ?? 'Pix',
    trocoParaCentavos: linha.troco_para,
    subtotalCentavos: linha.subtotal ?? linha.total + desconto - taxa,
    descontoCentavos: desconto,
    taxaEntregaCentavos: taxa,
    totalCentavos: linha.total,
    status: linha.status,
    criadoEm: paraIsoLocal(linha.criado_em),
    itens: [...(linha.itens_pedido ?? [])]
      .sort((a, b) => a.id - b.id)
      .map((i) => ({
        tipo: i.tipo === 'pizza' ? 'pizza' : 'produto',
        nome: i.tipo === 'pizza' ? i.nome.split(' + ')[0] : i.nome,
        sabores: i.sabores ?? [],
        adicionais: (i.itens_pedido_adicionais ?? []).map((a) => a.nome),
        observacao: i.observacao,
        precoCentavos: i.preco_unitario,
        quantidade: i.quantidade,
      })),
    historico: [...(linha.pedido_status_historico ?? [])]
      .sort((a, b) => a.id - b.id)
      .map((h) => ({ idRemoto: h.id, status: h.status, em: paraIsoLocal(h.criado_em) })),
  };
}

export class SupabasePedidoRepository {
  async listar(usuarioId: string): Promise<PedidoRemoto[]> {
    const { data, error } = await supabase
      .from('pedidos')
      .select(SELECT)
      .eq('cliente_id', usuarioId)
      .order('criado_em', { ascending: false });
    if (error) throw erroAmigavel(error);
    return (data as unknown as LinhaPedido[]).map(paraRemoto);
  }

  async buscar(usuarioId: string, idRemoto: string): Promise<PedidoRemoto | null> {
    const { data, error } = await supabase
      .from('pedidos')
      .select(SELECT)
      .eq('cliente_id', usuarioId)
      .eq('id', idRemoto)
      .maybeSingle();
    if (error) throw erroAmigavel(error);
    return data ? paraRemoto(data as unknown as LinhaPedido) : null;
  }

  async cancelar(idRemoto: string): Promise<boolean> {
    const { error } = await supabase.rpc('cancelar_pedido', { p_pedido_id: idRemoto });
    if (error) {
      if (error.hint === 'TRANSICAO_INVALIDA' || error.hint === 'NAO_ENCONTRADO') return false;
      throw erroAmigavel(error);
    }
    return true;
  }
}

