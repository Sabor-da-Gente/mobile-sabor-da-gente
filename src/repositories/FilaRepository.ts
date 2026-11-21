export type StatusItemFila = 'pendente' | 'enviando' | 'erro';

export type ItemFila = {
  id: number;
  usuarioId: string;
  operacao: string;
  payload: unknown;
  status: StatusItemFila;
  tentativas: number;
  ultimoErro: string | null;
  criadoEm: string;
};

export type ResumoFila = { pendentes: number; erros: number };

export interface FilaRepository {
  enfileirar(usuarioId: string, operacao: string, payload: unknown): Promise<number>;
  proximo(usuarioId: string): Promise<ItemFila | null>;
  concluir(id: number): Promise<void>;
  adiar(id: number, mensagem: string): Promise<void>;
  falhar(id: number, mensagem: string): Promise<void>;
  reenviar(id: number): Promise<void>;
  descartar(id: number): Promise<void>;
  listar(usuarioId: string): Promise<ItemFila[]>;
  resumo(usuarioId: string): Promise<ResumoFila>;
}
