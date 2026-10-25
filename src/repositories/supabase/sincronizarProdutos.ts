import type { SQLiteDatabase } from 'expo-sqlite';

import { supabase } from '@/services/supabase';

/** Não consulta o Supabase de novo antes deste intervalo. */
const INTERVALO_MS = 20_000;
/** Sem internet, não deixa o cardápio esperando além disso. */
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

let ultimaTentativa = 0;
let emAndamento: Promise<void> | null = null;

function comLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const limite = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error('Tempo esgotado ao sincronizar o cardápio.')), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

async function buscarRemotos(): Promise<ProdutoRemoto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select('id, categoria_id, nome, descricao, ingredientes, imagem_url, preco, destaque, ativo');
  if (error) throw error;
  return (data ?? []) as ProdutoRemoto[];
}

async function executar(db: SQLiteDatabase): Promise<void> {
  const remotos = await comLimite(buscarRemotos(), LIMITE_MS);
  if (remotos.length === 0) return;

  // Pizza é montada por tamanho/massa/sabores: as pizzas "produto" do legado não entram.
  const categorias = await db.getAllAsync<{ id: number }>("SELECT id FROM categorias WHERE tipo <> 'pizza'");
  const idsCategorias = categorias.map((c) => c.id);
  if (idsCategorias.length === 0) return;

  const permitidas = new Set(idsCategorias);
  const validos = remotos.filter((p) => permitidas.has(p.categoria_id));
  const idsRemotos = new Set(validos.map((p) => p.id));

  await db.withTransactionAsync(async () => {
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

    // Excluído no painel: some do app (fica inativo, porque favoritos/carrinho podem apontar para ele).
    const locais = await db.getAllAsync<{ id: number }>(
      `SELECT id FROM produtos WHERE ativo = 1 AND categoria_id IN (${idsCategorias.map(() => '?').join(',')})`,
      idsCategorias,
    );
    for (const local of locais) {
      if (!idsRemotos.has(local.id)) {
        await db.runAsync('UPDATE produtos SET ativo = 0 WHERE id = ?', local.id);
      }
    }
  });
}

/** Nunca lança erro: se falhar, o app segue com o cardápio que já tem. */
export function sincronizarProdutos(db: SQLiteDatabase): Promise<void> {
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
