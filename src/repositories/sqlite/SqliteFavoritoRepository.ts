import type { SQLiteDatabase } from 'expo-sqlite';

import type { AlvoFavorito, Favorito, FavoritoRepository } from '@/repositories/FavoritoRepository';

type ProdutoFavoritoRow = {
  favorito_id: number;
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  slug: string;
  icone: string | null;
};

type SaborFavoritoRow = {
  favorito_id: number;
  id: number;
  nome: string;
  descricao: string | null;
  a_partir_de: number | null;
};

export class SqliteFavoritoRepository implements FavoritoRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listar(): Promise<Favorito[]> {
    const [produtos, sabores] = await Promise.all([
      this.db.getAllAsync<ProdutoFavoritoRow>(
        `SELECT f.id AS favorito_id, p.id, p.nome, p.descricao, p.preco, c.slug, c.icone
           FROM favoritos f
           JOIN produtos p ON p.id = f.produto_id AND p.ativo = 1
           JOIN categorias c ON c.id = p.categoria_id AND c.ativa = 1`,
      ),
      this.db.getAllAsync<SaborFavoritoRow>(
        `SELECT f.id AS favorito_id, s.id, s.nome, s.descricao, MIN(sp.preco) AS a_partir_de
           FROM favoritos f
           JOIN sabores s ON s.id = f.sabor_id AND s.ativo = 1
           LEFT JOIN sabor_precos sp ON sp.sabor_id = s.id
          GROUP BY f.id`,
      ),
    ]);

    const lista: (Favorito & { ordem: number })[] = [
      ...produtos.map((p) => ({
        ordem: p.favorito_id,
        tipo: 'produto' as const,
        id: p.id,
        nome: p.nome,
        descricao: p.descricao ?? '',
        preco: p.preco,
        categoriaSlug: p.slug,
        icone: p.icone ?? '🍽️',
      })),
      ...sabores.map((s) => ({
        ordem: s.favorito_id,
        tipo: 'sabor' as const,
        id: s.id,
        nome: s.nome,
        descricao: s.descricao ?? '',
        aPartirDe: s.a_partir_de,
      })),
    ];
    return lista.sort((a, b) => b.ordem - a.ordem).map(({ ordem: _ordem, ...favorito }) => favorito);
  }

  async alternar({ tipo, id }: AlvoFavorito): Promise<boolean> {
    const coluna = tipo === 'produto' ? 'produto_id' : 'sabor_id';
    let favoritado = false;
    await this.db.withTransactionAsync(async () => {
      const removido = await this.db.runAsync(`DELETE FROM favoritos WHERE ${coluna} = ?`, id);
      if (removido.changes === 0) {
        await this.db.runAsync(`INSERT INTO favoritos (${coluna}) VALUES (?)`, id);
        favoritado = true;
      }
    });
    return favoritado;
  }
}
