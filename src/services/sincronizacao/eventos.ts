type Ouvinte = () => void;

const aoMudar = new Set<Ouvinte>();
const aoEnfileirar = new Set<Ouvinte>();

function inscrever(lista: Set<Ouvinte>, ouvinte: Ouvinte): () => void {
  lista.add(ouvinte);
  return () => {
    lista.delete(ouvinte);
  };
}

export function ouvirFila(ouvinte: Ouvinte): () => void {
  return inscrever(aoMudar, ouvinte);
}

export function ouvirNovosItens(ouvinte: Ouvinte): () => void {
  return inscrever(aoEnfileirar, ouvinte);
}

export function avisarFilaMudou(): void {
  for (const ouvinte of aoMudar) ouvinte();
}

export function avisarNovoItem(): void {
  for (const ouvinte of aoEnfileirar) ouvinte();
  avisarFilaMudou();
}

const aoAtualizarDados = new Set<Ouvinte>();

export function ouvirDadosAtualizados(ouvinte: Ouvinte): () => void {
  return inscrever(aoAtualizarDados, ouvinte);
}

let ultimaAtualizacao: string | null = null;

export function ultimaAtualizacaoDoServidor(): string | null {
  return ultimaAtualizacao;
}

export function avisarDadosAtualizados(): void {
  ultimaAtualizacao = new Date().toISOString();
  for (const ouvinte of aoAtualizarDados) ouvinte();
}
