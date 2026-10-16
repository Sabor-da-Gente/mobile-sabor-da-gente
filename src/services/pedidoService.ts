import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NovoPedido, Pedido } from '@/types';

const CHAVE_PEDIDOS = '@sabor-da-gente:pedidos:v1';
const API_URL = 'http://192.168.1.102:8080';
const TEMPO_LIMITE_API_MS = 4000;

async function lerPedidos(): Promise<Pedido[]> {
  const dados = await AsyncStorage.getItem(CHAVE_PEDIDOS);
  return dados ? JSON.parse(dados) : [];
}

async function gravarPedidos(pedidos: Pedido[]): Promise<void> {
  await AsyncStorage.setItem(CHAVE_PEDIDOS, JSON.stringify(pedidos));
}

async function enviarParaApi(pedido: Pedido): Promise<boolean> {
  const controlador = new AbortController();
  const cronometro = setTimeout(() => controlador.abort(), TEMPO_LIMITE_API_MS);

  try {
    const resposta = await fetch(`${API_URL}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
      signal: controlador.signal,
    });

    return resposta.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(cronometro);
  }
}

export async function listarPedidos(): Promise<Pedido[]> {
  const pedidos = await lerPedidos();

  return [...pedidos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export async function buscarPedido(id: string): Promise<Pedido | undefined> {
  const pedidos = await lerPedidos();

  return pedidos.find((pedido) => pedido.id === id);
}

export async function criarPedido(
  novo: NovoPedido,
): Promise<{ pedido: Pedido; enviado: boolean }> {
  const agora = new Date().toISOString();
  const marca = Date.now();

  const pedido: Pedido = {
    ...novo,
    id: `${marca}-${Math.random().toString(36).slice(2, 8)}`,
    numero: String(marca).slice(-6),
    status: 'recebido',
    criadoEm: agora,
    atualizadoEm: agora,
  };

  const pedidos = await lerPedidos();
  await gravarPedidos([...pedidos, pedido]);

  const enviado = await enviarParaApi(pedido);

  return { pedido, enviado };
}

export async function cancelarPedido(id: string): Promise<boolean> {
  const pedidos = await lerPedidos();
  const alvo = pedidos.find((pedido) => pedido.id === id);

  if (!alvo || alvo.status !== 'recebido') {
    return false;
  }

  await gravarPedidos(
    pedidos.map((pedido) =>
      pedido.id === id
        ? { ...pedido, status: 'cancelado', atualizadoEm: new Date().toISOString() }
        : pedido,
    ),
  );

  return true;
}

export async function excluirPedido(id: string): Promise<void> {
  const pedidos = await lerPedidos();

  await gravarPedidos(pedidos.filter((pedido) => pedido.id !== id));
}