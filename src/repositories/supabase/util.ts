import { supabase } from '@/services/supabase';
import { FalhaEnvio } from '@/services/sincronizacao/operacoes';

const HINTS_AMIGAVEIS = [
  'NAO_AUTENTICADO',
  'SEM_PERMISSAO',
  'VALIDACAO',
  'INDISPONIVEL',
  'NAO_ENCONTRADO',
  'TRANSICAO_INVALIDA',
];

type ErroSupabase = { message: string; hint?: string | null; code?: string | null };

export async function usuarioAtual(): Promise<{ id: string; email: string | null } | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return { id: data.session.user.id, email: data.session.user.email ?? null };
}

export async function exigirUsuario(mensagem = 'Entre na sua conta para continuar.') {
  const usuario = await usuarioAtual();
  if (!usuario) throw new Error(mensagem);
  return usuario;
}

export function erroAmigavel(error: ErroSupabase): Error {
  if (error.hint && HINTS_AMIGAVEIS.includes(error.hint)) return new Error(error.message);
  console.error('Erro do Supabase:', error);
  return new Error('Não foi possível falar com o servidor. Tente novamente.');
}

const CODIGOS_SESSAO = ['PGRST301', 'PGRST302', 'PGRST303'];

export function falhaDoSupabase(error: ErroSupabase, status: number): FalhaEnvio {
  if (status === 401 || error.hint === 'NAO_AUTENTICADO' || CODIGOS_SESSAO.includes(error.code ?? '')) {
    return new FalhaEnvio('Sessão expirada. Entre na sua conta de novo.', 'sessao');
  }
  if (status === 0 || status === 408 || status === 429 || status >= 500) {
    return new FalhaEnvio('Não foi possível falar com o servidor.', 'rede');
  }
  return new FalhaEnvio(erroAmigavel(error).message, 'regra');
}
