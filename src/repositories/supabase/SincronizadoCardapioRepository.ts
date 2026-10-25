import type { SQLiteDatabase } from 'expo-sqlite';

import type { Produto } from '@/models/Produto';
import type { FiltroProdutos } from '@/repositories/CardapioRepository';
import { SqliteCardapioRepository } from '@/repositories/sqlite/SqliteCardapioRepository';

import { sincronizarProdutos } from './sincronizarProdutos';

/** Cardápio do SQLite, atualizado com os produtos do painel (Supabase) antes de listar. */
export class SincronizadoCardapioRepository extends SqliteCardapioRepository {
  private readonly banco: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    super(db);
    this.banco = db;
  }

  override async listarProdutos(filtro: FiltroProdutos = {}): Promise<Produto[]> {
    await sincronizarProdutos(this.banco);
    return super.listarProdutos(filtro);
  }
}
