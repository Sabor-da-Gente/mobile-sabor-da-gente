import { supabase } from '@/services/supabase';

/** Códigos que o banco devolve em `hint` com mensagem pronta para o usuário. */
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

/** Mensagem do banco quando é para o usuário; texto genérico para o resto. */
export function erroAmigavel(error: ErroSupabase): Error {
  if (error.hint && HINTS_AMIGAVEIS.includes(error.hint)) return new Error(error.message);
  console.error('Erro do Supabase:', error);
  return new Error('Não foi possível falar com o servidor. Tente novamente.');
}
