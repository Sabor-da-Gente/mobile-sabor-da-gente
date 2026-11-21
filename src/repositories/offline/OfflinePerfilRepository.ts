import type { SQLiteDatabase } from 'expo-sqlite';

import type { DadosEndereco, Endereco, Perfil } from '@/models/Perfil';
import type { PerfilRepository } from '@/repositories/PerfilRepository';
import { SqliteFilaRepository } from '@/repositories/sqlite/SqliteFilaRepository';
import { SqlitePerfilRepository } from '@/repositories/sqlite/SqlitePerfilRepository';
import { falhaDoSupabase } from '@/repositories/supabase/util';
import { avisarNovoItem } from '@/services/sincronizacao/eventos';
import { registrarOperacao } from '@/services/sincronizacao/operacoes';
import { supabase } from '@/services/supabase';

type DadosPerfilEnviados = { nome: string; telefone: string };

export type UsuarioLocal = { id: string; email: string | null };

export class OfflinePerfilRepository implements PerfilRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly usuario: UsuarioLocal | null,
    private readonly remoto: PerfilRepository,
  ) {}

  private local(usuarioId: string) {
    return new SqlitePerfilRepository(this.db, usuarioId);
  }

  async buscarPerfil(): Promise<Perfil | null> {
    if (!this.usuario) return null;
    const local = this.local(this.usuario.id);

    const salvo = await local.buscarPerfil();
    if (salvo) return { ...salvo, email: this.usuario.email };

    try {
      const remoto = await this.remoto.buscarPerfil();
      if (remoto) await local.gravarPerfil(remoto, true);
      return remoto;
    } catch (e) {
      console.warn('Perfil indisponível offline:', e);
      return null;
    }
  }

  async salvarPerfil(perfil: Perfil): Promise<void> {
    if (!this.usuario) throw new Error('Entre na sua conta para salvar o perfil.');
    const usuarioId = this.usuario.id;
    const enviado: DadosPerfilEnviados = { nome: perfil.nome, telefone: perfil.telefone };

    await this.db.withTransactionAsync(async () => {
      await this.local(usuarioId).gravarPerfil(perfil, false);
      await new SqliteFilaRepository(this.db).enfileirar(usuarioId, 'salvar_perfil', enviado, {
        substituirPendentes: true,
        avisar: false,
      });
    });
    avisarNovoItem();
  }

  listarEnderecos(): Promise<Endereco[]> {
    return this.remoto.listarEnderecos();
  }

  buscarEndereco(id: number): Promise<Endereco | null> {
    return this.remoto.buscarEndereco(id);
  }

  salvarEndereco(dados: DadosEndereco, id?: number): Promise<number> {
    return this.remoto.salvarEndereco(dados, id);
  }

  marcarPrincipal(id: number): Promise<void> {
    return this.remoto.marcarPrincipal(id);
  }

  removerEndereco(id: number): Promise<void> {
    return this.remoto.removerEndereco(id);
  }
}

export function registrarOperacoesPerfil(): void {
  registrarOperacao<DadosPerfilEnviados>('salvar_perfil', async (dados, { db, usuarioId }) => {
    const { error, status } = await supabase
      .from('perfis')
      .update({ nome: dados.nome, telefone: dados.telefone })
      .eq('id', usuarioId);
    if (error) throw falhaDoSupabase(error, status);
    await new SqlitePerfilRepository(db, usuarioId).marcarPerfilSincronizado(dados);
  });
}
