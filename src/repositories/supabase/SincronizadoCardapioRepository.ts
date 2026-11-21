import type { SQLiteDatabase } from 'expo-sqlite';

import type { OpcoesPizza, Sabor } from '@/models/Pizza';
import type { Produto } from '@/models/Produto';
import type { FiltroProdutos } from '@/repositories/CardapioRepository';
import { SqliteCardapioRepository } from '@/repositories/sqlite/SqliteCardapioRepository';

import { sincronizarCardapio } from './sincronizarCardapio';

export class SincronizadoCardapioRepository extends SqliteCardapioRepository {
  private readonly banco: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    super(db);
    this.banco = db;
  }

  override async listarProdutos(filtro: FiltroProdutos = {}): Promise<Produto[]> {
    await sincronizarCardapio(this.banco);
    return super.listarProdutos(filtro);
  }

  override async buscarOpcoesPizza(): Promise<OpcoesPizza> {
    await sincronizarCardapio(this.banco);
    return super.buscarOpcoesPizza();
  }

  override async listarDestaques(): Promise<{ produtos: Produto[]; sabores: Sabor[] }> {
    await sincronizarCardapio(this.banco);
    return super.listarDestaques();
  }
}