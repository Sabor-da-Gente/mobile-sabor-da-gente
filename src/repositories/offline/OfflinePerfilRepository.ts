import type { SQLiteDatabase } from 'expo-sqlite';

import type { DadosEndereco, Endereco, Perfil } from '@/models/Perfil';
import type { PerfilRepository } from '@/repositories/PerfilRepository';
import { SqliteFilaRepository } from '@/repositories/sqlite/SqliteFilaRepository';
import { SqlitePerfilRepository } from '@/repositories/sqlite/SqlitePerfilRepository';
import { falhaDoSupabase } from '@/repositories/supabase/util';
import { avisarNovoItem } from '@/services/sincronizacao/eventos';
import { FalhaEnvio, registrarOperacao } from '@/services/sincronizacao/operacoes';
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

  async listarEnderecos(): Promise<Endereco[]> {
    if (!this.usuario) return [];
    const local = this.local(this.usuario.id);

    if ((await local.contarEnderecos()) === 0) {
      try {
        await local.importarEnderecos(await this.remoto.listarEnderecos());
      } catch (e) {
        console.warn('Endereços indisponíveis offline:', e);
      }
    }
    return local.listarEnderecos();
  }

  async buscarEndereco(id: number): Promise<Endereco | null> {
    if (!this.usuario) return null;
    return this.local(this.usuario.id).buscarEndereco(id);
  }

  async salvarEndereco(dados: DadosEndereco, id?: number): Promise<number> {
    const usuarioId = this.exigirUsuario('Entre na sua conta para salvar o endereço.');
    const local = this.local(usuarioId);
    const fila = new SqliteFilaRepository(this.db);
    let idLocal = id ?? 0;

    await this.db.withTransactionAsync(async () => {
      if (id === undefined) {
        idLocal = await local.salvarEndereco(dados);
        const principal = (await local.idPrincipal()) === idLocal;
        await fila.enfileirar(usuarioId, 'criar_endereco', { idLocal, dados, principal }, { avisar: false });
        return;
      }

      await local.salvarEndereco(dados, id);
      const criar = await fila.buscarPendente(usuarioId, 'criar_endereco', id);
      if (criar) {
        await fila.atualizarPayload(criar.id, { ...(criar.payload as PayloadCriarEndereco), dados });
        return;
      }
      await fila.removerPendentes(usuarioId, 'editar_endereco', id);
      await fila.enfileirar(usuarioId, 'editar_endereco', { idLocal: id, dados }, { avisar: false });
    });
    avisarNovoItem();
    return idLocal;
  }

  async marcarPrincipal(id: number): Promise<void> {
    const usuarioId = this.exigirUsuario();
    await this.db.withTransactionAsync(async () => {
      await this.local(usuarioId).marcarPrincipal(id);
      await new SqliteFilaRepository(this.db).enfileirar(
        usuarioId,
        'endereco_principal',
        { idLocal: id },
        { substituirPendentes: true, avisar: false },
      );
    });
    avisarNovoItem();
  }

  async removerEndereco(id: number): Promise<void> {
    const usuarioId = this.exigirUsuario();
    const local = this.local(usuarioId);
    const fila = new SqliteFilaRepository(this.db);

    await this.db.withTransactionAsync(async () => {
      const principalAntes = await local.idPrincipal();
      await local.removerEndereco(id);
      const principalDepois = await local.idPrincipal();

      await fila.removerPendentes(usuarioId, 'editar_endereco', id);
      await fila.removerPendentes(usuarioId, 'endereco_principal', id);

      if (await fila.buscarPendente(usuarioId, 'criar_endereco', id)) {
        await fila.removerPendentes(usuarioId, 'criar_endereco', id);
      } else {
        await fila.enfileirar(usuarioId, 'remover_endereco', { idLocal: id }, { avisar: false });
      }

      if (principalDepois !== null && principalDepois !== principalAntes) {
        await fila.enfileirar(
          usuarioId,
          'endereco_principal',
          { idLocal: principalDepois },
          { substituirPendentes: true, avisar: false },
        );
      }
    });
    avisarNovoItem();
  }

  private exigirUsuario(mensagem = 'Entre na sua conta para continuar.'): string {
    if (!this.usuario) throw new Error(mensagem);
    return this.usuario.id;
  }
}

type PayloadCriarEndereco = { idLocal: number; dados: DadosEndereco; principal: boolean };
type PayloadEndereco = { idLocal: number };
type PayloadEditarEndereco = { idLocal: number; dados: DadosEndereco };

const CAMPOS_OPCIONAIS = ['apelido', 'complemento', 'cep', 'referencia'] as const;

async function buscarJaCriado(
  dados: DadosEndereco,
  usuarioId: string,
  jaLigados: number[],
): Promise<number | null> {
  let consulta = supabase
    .from('enderecos')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('ativo', true)
    .eq('logradouro', dados.logradouro)
    .eq('numero', dados.numero)
    .eq('bairro', dados.bairro)
    .eq('cidade', dados.cidade)
    .eq('uf', dados.uf);
  for (const campo of CAMPOS_OPCIONAIS) {
    const valor = dados[campo];
    consulta = valor === null ? consulta.is(campo, null) : consulta.eq(campo, valor);
  }
  if (jaLigados.length > 0) consulta = consulta.not('id', 'in', `(${jaLigados.join(',')})`);

  const { data, error, status } = await consulta.order('id').limit(1);
  if (error) throw falhaDoSupabase(error, status);
  return data?.[0]?.id ?? null;
}

async function exigirIdRemoto(local: SqlitePerfilRepository, idLocal: number): Promise<number> {
  const idRemoto = await local.idRemoto(idLocal);
  if (idRemoto === null) {
    throw new FalhaEnvio('O endereço ainda não foi criado no servidor.', 'regra');
  }
  return idRemoto;
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

  registrarOperacao<PayloadCriarEndereco>('criar_endereco', async (p, { db, usuarioId }) => {
    const local = new SqlitePerfilRepository(db, usuarioId);
    let idRemoto =
      (await local.idRemoto(p.idLocal)) ??
      (await buscarJaCriado(p.dados, usuarioId, await local.idsRemotos()));

    if (idRemoto === null) {
      const { data, error, status } = await supabase
        .from('enderecos')
        .insert({ ...p.dados, usuario_id: usuarioId, principal: false })
        .select('id')
        .single();
      if (error) throw falhaDoSupabase(error, status);
      idRemoto = data.id as number;
    }
    await local.definirIdRemoto(p.idLocal, idRemoto);

    if (p.principal) {
      const { error, status } = await supabase.rpc('definir_endereco_principal', {
        p_endereco_id: idRemoto,
      });
      if (error) throw falhaDoSupabase(error, status);
    }
    await local.marcarEnderecoSincronizado(p.idLocal);
  });

  registrarOperacao<PayloadEditarEndereco>('editar_endereco', async (p, { db, usuarioId }) => {
    const local = new SqlitePerfilRepository(db, usuarioId);
    const { error, status } = await supabase
      .from('enderecos')
      .update(p.dados)
      .eq('id', await exigirIdRemoto(local, p.idLocal))
      .eq('usuario_id', usuarioId);
    if (error) throw falhaDoSupabase(error, status);
    await local.marcarEnderecoSincronizado(p.idLocal);
  });

  registrarOperacao<PayloadEndereco>('endereco_principal', async (p, { db, usuarioId }) => {
    const local = new SqlitePerfilRepository(db, usuarioId);
    const { error, status } = await supabase.rpc('definir_endereco_principal', {
      p_endereco_id: await exigirIdRemoto(local, p.idLocal),
    });
    if (error) throw falhaDoSupabase(error, status);
    await local.marcarEnderecoSincronizado(p.idLocal);
  });

  registrarOperacao<PayloadEndereco>('remover_endereco', async (p, { db, usuarioId }) => {
    const local = new SqlitePerfilRepository(db, usuarioId);
    const idRemoto = await local.idRemoto(p.idLocal);
    if (idRemoto !== null) {
      const { error, status } = await supabase
        .from('enderecos')
        .update({ ativo: false, principal: false })
        .eq('id', idRemoto)
        .eq('usuario_id', usuarioId);
      if (error) throw falhaDoSupabase(error, status);
    }
    await local.marcarEnderecoSincronizado(p.idLocal);
  });
}
