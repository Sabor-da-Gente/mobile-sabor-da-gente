import type { SQLiteDatabase } from 'expo-sqlite';

import { Categoria, type CategoriaRow } from '@/models/Categoria';
import {
  Adicional,
  type AdicionalRow,
  Massa,
  type MassaRow,
  type OpcoesPizza,
  Sabor,
  type SaborPrecoRow,
  type SaborRow,
  Tamanho,
  type TamanhoRow,
} from '@/models/Pizza';
import { Produto, type ProdutoRow } from '@/models/Produto';
import type { CardapioRepository, FiltroProdutos } from '@/repositories/CardapioRepository';

/** Cardápio lido do SQLite do aparelho. Só retorna itens ativos. */
export class SqliteCardapioRepository implements CardapioRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listarCategorias(): Promise<Categoria[]> {
    const rows = await this.db.getAllAsync<CategoriaRow>(
      'SELECT id, nome, slug, tipo, icone, ordem FROM categorias WHERE ativa = 1 ORDER BY ordem, nome',
    );
    return rows.map(Categoria.fromRow);
  }

  async buscarCategoria(slug: string): Promise<Categoria | null> {
    const row = await this.db.getFirstAsync<CategoriaRow>(
      'SELECT id, nome, slug, tipo, icone, ordem FROM categorias WHERE slug = ? AND ativa = 1',
      slug,
    );
    return row ? Categoria.fromRow(row) : null;
  }

  async listarProdutos(filtro: FiltroProdutos = {}): Promise<Produto[]> {
    const condicoes = ['p.ativo = 1', 'c.ativa = 1'];
    const params: (string | number)[] = [];

    if (filtro.categoriaSlug) {
      condicoes.push('c.slug = ?');
      params.push(filtro.categoriaSlug);
    }
    if (filtro.somenteDestaques) {
      condicoes.push('p.destaque = 1');
    }

    const rows = await this.db.getAllAsync<ProdutoRow>(
      `SELECT p.id, p.categoria_id, p.nome, p.descricao, p.ingredientes, p.imagem_url, p.preco, p.destaque
         FROM produtos p
         JOIN categorias c ON c.id = p.categoria_id
        WHERE ${condicoes.join(' AND ')}
        ORDER BY c.ordem, p.nome`,
      params,
    );
    return rows.map(Produto.fromRow);
  }

  async buscarOpcoesPizza(): Promise<OpcoesPizza> {
    const [tamanhos, massas, sabores, precos, adicionais] = await Promise.all([
      this.db.getAllAsync<TamanhoRow>(
        'SELECT id, nome, fatias, max_sabores, ordem FROM tamanhos WHERE ativo = 1 ORDER BY ordem',
      ),
      this.db.getAllAsync<MassaRow>(
        'SELECT id, nome, acrescimo FROM massas WHERE ativo = 1 ORDER BY id',
      ),
      this.db.getAllAsync<SaborRow>(
        'SELECT id, nome, descricao, ingredientes, imagem_url, destaque FROM sabores WHERE ativo = 1 ORDER BY nome',
      ),
      this.db.getAllAsync<SaborPrecoRow>(
        `SELECT sp.sabor_id, sp.tamanho_id, sp.preco
           FROM sabor_precos sp
           JOIN tamanhos t ON t.id = sp.tamanho_id AND t.ativo = 1`,
      ),
      this.db.getAllAsync<AdicionalRow>(
        'SELECT id, nome, preco FROM adicionais WHERE ativo = 1 ORDER BY nome',
      ),
    ]);

    return {
      tamanhos: tamanhos.map(Tamanho.fromRow),
      massas: massas.map(Massa.fromRow),
      sabores: sabores.map((s) => Sabor.fromRow(s, precos)),
      adicionais: adicionais.map(Adicional.fromRow),
    };
  }

  async listarDestaques(): Promise<{ produtos: Produto[]; sabores: Sabor[] }> {
    const [produtos, opcoes] = await Promise.all([
      this.listarProdutos({ somenteDestaques: true }),
      this.buscarOpcoesPizza(),
    ]);
    return { produtos, sabores: opcoes.sabores.filter((s) => s.destaque) };
  }
}
