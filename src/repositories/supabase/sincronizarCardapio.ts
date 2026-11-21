import type { SQLiteDatabase } from 'expo-sqlite';

import { supabase } from '@/services/supabase';
import { comLimite } from '@/utils/tempo';

const INTERVALO_MS = 20_000;
const LIMITE_MS = 5_000;

type ProdutoRemoto = {
  id: number;
  categoria_id: number;
  nome: string;
  descricao: string | null;
  ingredientes: string | null;
  imagem_url: string | null;
  preco: number;
  destaque: boolean;
  ativo: boolean;
};

type TamanhoRemoto = {
  id: number;
  nome: string;
  fatias: number;
  max_sabores: number;
  ordem: number;
  ativo: boolean;
};

type MassaRemota = { id: number; nome: string; acrescimo: number; ativo: boolean };

type SaborRemoto = {
  id: number;
  nome: string;
  descricao: string | null;
  ingredientes: string | null;
  imagem_url: string | null;
  destaque: boolean;
  ativo: boolean;
};

type SaborPrecoRemoto = { sabor_id: number; tamanho_id: number; preco: number };

type AdicionalRemoto = { id: number; nome: string; preco: number; ativo: boolean };

let ultimaTentativa = 0;
let emAndamento: Promise<void> | null = null;

async function buscar<T>(tabela: string, colunas: string): Promise<T[]> {
  const { data, error } = await supabase.from(tabela).select(colunas);
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}

async function buscarTudo() {
  const [produtos, tamanhos, massas, sabores, precos, adicionais] = await Promise.all([
    buscar<ProdutoRemoto>(
      'produtos',
      'id, categoria_id, nome, descricao, ingredientes, imagem_url, preco, destaque, ativo',
    ),
    buscar<TamanhoRemoto>('tamanhos', 'id, nome, fatias, max_sabores, ordem, ativo'),
    buscar<MassaRemota>('massas', 'id, nome, acrescimo, ativo'),
    buscar<SaborRemoto>('sabores', 'id, nome, descricao, ingredientes, imagem_url, destaque, ativo'),
    buscar<SaborPrecoRemoto>('sabor_precos', 'sabor_id, tamanho_id, preco'),
    buscar<AdicionalRemoto>('adicionais', 'id, nome, preco, ativo'),
  ]);
  return { produtos, tamanhos, massas, sabores, precos, adicionais };
}

async function desativarAusentes(
  db: SQLiteDatabase,
  tabela: string,
  idsRemotos: Set<number>,
  onde = '1 = 1',
  params: number[] = [],
): Promise<void> {
  const locais = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM ${tabela} WHERE ativo = 1 AND ${onde}`,
    params,
  );
  for (const local of locais) {
    if (!idsRemotos.has(local.id)) {
      await db.runAsync(`UPDATE ${tabela} SET ativo = 0 WHERE id = ?`, local.id);
    }
  }
}

async function gravarProdutos(db: SQLiteDatabase, remotos: ProdutoRemoto[]): Promise<void> {
  if (remotos.length === 0) return;
  const categorias = await db.getAllAsync<{ id: number }>("SELECT id FROM categorias WHERE tipo <> 'pizza'");
  const idsCategorias = categorias.map((c) => c.id);
  if (idsCategorias.length === 0) return;

  const permitidas = new Set(idsCategorias);
  const validos = remotos.filter((p) => permitidas.has(p.categoria_id));

  for (const p of validos) {
    await db.runAsync(
      `INSERT INTO produtos (id, categoria_id, nome, descricao, ingredientes, imagem_url, preco, destaque, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         categoria_id = excluded.categoria_id, nome = excluded.nome, descricao = excluded.descricao,
         ingredientes = excluded.ingredientes, imagem_url = excluded.imagem_url, preco = excluded.preco,
         destaque = excluded.destaque, ativo = excluded.ativo`,
      p.id,
      p.categoria_id,
      p.nome,
      p.descricao ?? '',
      p.ingredientes,
      p.imagem_url,
      p.preco,
      p.destaque ? 1 : 0,
      p.ativo ? 1 : 0,
    );
  }

  await desativarAusentes(
    db,
    'produtos',
    new Set(validos.map((p) => p.id)),
    `categoria_id IN (${idsCategorias.map(() => '?').join(',')})`,
    idsCategorias,
  );
}

async function gravarTamanhos(db: SQLiteDatabase, remotos: TamanhoRemoto[]): Promise<void> {
  if (remotos.length === 0) return;
  for (const t of remotos) {
    await db.runAsync(
      `INSERT INTO tamanhos (id, nome, fatias, max_sabores, ordem, ativo)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome, fatias = excluded.fatias, max_sabores = excluded.max_sabores,
         ordem = excluded.ordem, ativo = excluded.ativo`,
      t.id,
      t.nome,
      t.fatias,
      t.max_sabores,
      t.ordem,
      t.ativo ? 1 : 0,
    );
  }
  await desativarAusentes(db, 'tamanhos', new Set(remotos.map((t) => t.id)));
}

async function gravarMassas(db: SQLiteDatabase, remotos: MassaRemota[]): Promise<void> {
  if (remotos.length === 0) return;
  for (const m of remotos) {
    await db.runAsync(
      `INSERT INTO massas (id, nome, acrescimo, ativo)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome, acrescimo = excluded.acrescimo, ativo = excluded.ativo`,
      m.id,
      m.nome,
      m.acrescimo,
      m.ativo ? 1 : 0,
    );
  }
  await desativarAusentes(db, 'massas', new Set(remotos.map((m) => m.id)));
}

async function gravarSabores(db: SQLiteDatabase, remotos: SaborRemoto[]): Promise<void> {
  if (remotos.length === 0) return;
  for (const s of remotos) {
    await db.runAsync(
      `INSERT INTO sabores (id, nome, descricao, ingredientes, imagem_url, destaque, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome, descricao = excluded.descricao, ingredientes = excluded.ingredientes,
         imagem_url = excluded.imagem_url, destaque = excluded.destaque, ativo = excluded.ativo`,
      s.id,
      s.nome,
      s.descricao,
      s.ingredientes,
      s.imagem_url,
      s.destaque ? 1 : 0,
      s.ativo ? 1 : 0,
    );
  }
  await desativarAusentes(db, 'sabores', new Set(remotos.map((s) => s.id)));
}

async function gravarPrecos(db: SQLiteDatabase, remotos: SaborPrecoRemoto[]): Promise<void> {
  if (remotos.length === 0) return;
  const sabores = new Set((await db.getAllAsync<{ id: number }>('SELECT id FROM sabores')).map((s) => s.id));
  const tamanhos = new Set((await db.getAllAsync<{ id: number }>('SELECT id FROM tamanhos')).map((t) => t.id));
  const validos = remotos.filter((p) => sabores.has(p.sabor_id) && tamanhos.has(p.tamanho_id));
  if (validos.length === 0) return;

  await db.runAsync('DELETE FROM sabor_precos');
  for (const p of validos) {
    await db.runAsync(
      'INSERT INTO sabor_precos (sabor_id, tamanho_id, preco) VALUES (?, ?, ?)',
      p.sabor_id,
      p.tamanho_id,
      p.preco,
    );
  }
}

async function gravarAdicionais(db: SQLiteDatabase, remotos: AdicionalRemoto[]): Promise<void> {
  if (remotos.length === 0) return;
  for (const a of remotos) {
    await db.runAsync(
      `INSERT INTO adicionais (id, nome, preco, ativo)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome, preco = excluded.preco, ativo = excluded.ativo`,
      a.id,
      a.nome,
      a.preco,
      a.ativo ? 1 : 0,
    );
  }
  await desativarAusentes(db, 'adicionais', new Set(remotos.map((a) => a.id)));
}

async function executar(db: SQLiteDatabase): Promise<void> {
  const remoto = await comLimite(buscarTudo(), LIMITE_MS, 'Tempo esgotado ao sincronizar o cardápio.');

  await db.withTransactionAsync(async () => {
    await gravarProdutos(db, remoto.produtos);
    await gravarTamanhos(db, remoto.tamanhos);
    await gravarMassas(db, remoto.massas);
    await gravarSabores(db, remoto.sabores);
    await gravarPrecos(db, remoto.precos);
    await gravarAdicionais(db, remoto.adicionais);
  });
}

export function sincronizarCardapio(db: SQLiteDatabase): Promise<void> {
  if (emAndamento) return emAndamento;
  if (Date.now() - ultimaTentativa < INTERVALO_MS) return Promise.resolve();

  emAndamento = executar(db)
    .catch((e) => console.warn('Não foi possível sincronizar o cardápio:', e))
    .finally(() => {
      ultimaTentativa = Date.now();
      emAndamento = null;
    });
  return emAndamento;
}