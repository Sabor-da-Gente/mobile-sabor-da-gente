import { Endereco, type DadosEndereco, type EnderecoRow, type Perfil } from '@/models/Perfil';
import type { PerfilRepository } from '@/repositories/PerfilRepository';
import { supabase } from '@/services/supabase';

import { erroAmigavel, exigirUsuario, usuarioAtual } from './util';

const COLUNAS = 'id, apelido, logradouro, numero, complemento, bairro, cidade, uf, cep, referencia, principal';

type LinhaEndereco = Omit<EnderecoRow, 'principal'> & { principal: boolean };

function paraEndereco(linha: LinhaEndereco): Endereco {
  return Endereco.fromRow({ ...linha, principal: linha.principal ? 1 : 0 });
}

/** Perfil (tabela perfis) e endereços (tabela enderecos) da conta logada. */
export class SupabasePerfilRepository implements PerfilRepository {
  async buscarPerfil(): Promise<Perfil | null> {
    const usuario = await usuarioAtual();
    if (!usuario) return null;

    const { data, error } = await supabase
      .from('perfis')
      .select('nome, telefone')
      .eq('id', usuario.id)
      .maybeSingle();
    if (error) throw erroAmigavel(error);
    if (!data) return null;

    return { nome: data.nome, telefone: data.telefone ?? '', email: usuario.email };
  }

  async salvarPerfil(perfil: Perfil): Promise<void> {
    const usuario = await exigirUsuario('Entre na sua conta para salvar o perfil.');
    const { error } = await supabase
      .from('perfis')
      .update({ nome: perfil.nome, telefone: perfil.telefone })
      .eq('id', usuario.id);
    if (error) throw erroAmigavel(error);
  }

  async listarEnderecos(): Promise<Endereco[]> {
    const usuario = await usuarioAtual();
    if (!usuario) return [];

    const { data, error } = await supabase
      .from('enderecos')
      .select(COLUNAS)
      .eq('usuario_id', usuario.id)
      .eq('ativo', true)
      .order('principal', { ascending: false })
      .order('id');
    if (error) throw erroAmigavel(error);
    return (data as unknown as LinhaEndereco[]).map(paraEndereco);
  }

  async buscarEndereco(id: number): Promise<Endereco | null> {
    const usuario = await usuarioAtual();
    if (!usuario) return null;

    const { data, error } = await supabase
      .from('enderecos')
      .select(COLUNAS)
      .eq('id', id)
      .eq('usuario_id', usuario.id)
      .eq('ativo', true)
      .maybeSingle();
    if (error) throw erroAmigavel(error);
    return data ? paraEndereco(data as unknown as LinhaEndereco) : null;
  }

  async salvarEndereco(dados: DadosEndereco, id?: number): Promise<number> {
    const usuario = await exigirUsuario('Entre na sua conta para salvar o endereço.');

    if (id !== undefined) {
      const { error } = await supabase
        .from('enderecos')
        .update(dados)
        .eq('id', id)
        .eq('usuario_id', usuario.id);
      if (error) throw erroAmigavel(error);
      return id;
    }

    // O primeiro endereço vira o principal.
    const { count, error: erroContagem } = await supabase
      .from('enderecos')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', usuario.id)
      .eq('ativo', true);
    if (erroContagem) throw erroAmigavel(erroContagem);

    const { data, error } = await supabase
      .from('enderecos')
      .insert({ ...dados, usuario_id: usuario.id, principal: (count ?? 0) === 0 })
      .select('id')
      .single();
    if (error) throw erroAmigavel(error);
    return data.id as number;
  }

  async marcarPrincipal(id: number): Promise<void> {
    const usuario = await exigirUsuario();

    const { error: erroLimpar } = await supabase
      .from('enderecos')
      .update({ principal: false })
      .eq('usuario_id', usuario.id);
    if (erroLimpar) throw erroAmigavel(erroLimpar);

    const { error } = await supabase
      .from('enderecos')
      .update({ principal: true })
      .eq('id', id)
      .eq('usuario_id', usuario.id);
    if (error) throw erroAmigavel(error);
  }

  async removerEndereco(id: number): Promise<void> {
    const usuario = await exigirUsuario();

    const { error } = await supabase
      .from('enderecos')
      .update({ ativo: false, principal: false })
      .eq('id', id)
      .eq('usuario_id', usuario.id);
    if (error) throw erroAmigavel(error);

    // Se o removido era o principal, o primeiro que sobrar assume.
    const restantes = await this.listarEnderecos();
    if (restantes.length > 0 && !restantes.some((e) => e.principal)) {
      await this.marcarPrincipal(restantes[0].id);
    }
  }
}
