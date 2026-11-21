import { addNetworkStateListener, getNetworkStateAsync, type NetworkState } from 'expo-network';

type Ouvinte = (online: boolean) => void;

let online = true;
let iniciado = false;
const ouvintes = new Set<Ouvinte>();

function estaOnline(estado: NetworkState): boolean {
  return estado.isConnected !== false && estado.isInternetReachable !== false;
}

function atualizar(estado: NetworkState): void {
  const agora = estaOnline(estado);
  if (agora === online) return;
  online = agora;
  for (const ouvinte of ouvintes) ouvinte(online);
}

function iniciar(): void {
  if (iniciado) return;
  iniciado = true;
  addNetworkStateListener(atualizar);
  getNetworkStateAsync()
    .then(atualizar)
    .catch((e) => console.warn('Não foi possível ler o estado da conexão:', e));
}

export function onlineAgora(): boolean {
  iniciar();
  return online;
}

export async function verificarConexao(): Promise<boolean> {
  iniciar();
  try {
    atualizar(await getNetworkStateAsync());
  } catch (e) {
    console.warn('Não foi possível ler o estado da conexão:', e);
  }
  return online;
}

export function ouvirConexao(ouvinte: Ouvinte): () => void {
  iniciar();
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function aoVoltarConexao(acao: () => void): () => void {
  return ouvirConexao((agora) => {
    if (agora) acao();
  });
}
