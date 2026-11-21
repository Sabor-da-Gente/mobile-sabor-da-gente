import type { SQLiteDatabase } from 'expo-sqlite';

import type { AlvoFavorito, Favorito, FavoritoRepository } from '@/repositories/FavoritoRepository';
import { SqliteFilaRepository } from '@/repositories/sqlite/SqliteFilaRepository';

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

type FavoritoLocalRow = {
  id: number;
  produto_id: number | null;
  sabor_id: number | null;
};

type FavoritoImportado = AlvoFavorito & { criadoEm: string };

function chave({ tipo, id }: AlvoFavorito): string {
  return `${tipo}:${id}`;
}

function alvoDe(linha: FavoritoLocalRow): AlvoFavorito | null {
  if (linha.produto_id !== null) return { tipo: 'produto', id: linha.produto_id };
  if (linha.sabor_id !== null) return { tipo: 'sabor', id: linha.sabor_id };
  return null;
}

export class SqliteFavoritoRepository implements FavoritoRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly usuarioId: string | null,
  ) {}

  async listar(): Promise<Favorito[]> {
    const [produtos, sabores] = await Promise.all([
      this.db.getAllAsync<ProdutoFavoritoRow>(
        `SELECT f.id AS favorito_id, p.id, p.nome, p.descricao, p.preco, c.slug, c.icone
           FROM favoritos f
           JOIN produtos p ON p.id = f.produto_id AND p.ativo = 1
           JOIN categorias c ON c.id = p.categoria_id AND c.ativa = 1
          WHERE f.usuario_id IS ?`,
        this.usuarioId,
      ),
      this.db.getAllAsync<SaborFavoritoRow>(
        `SELECT f.id AS favorito_id, s.id, s.nome, s.descricao, MIN(sp.preco) AS a_partir_de
           FROM favoritos f
           JOIN sabores s ON s.id = f.sabor_id AND s.ativo = 1
           LEFT JOIN sabor_precos sp ON sp.sabor_id = s.id
          WHERE f.usuario_id IS ?
          GROUP BY f.id`,
        this.usuarioId,
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

  async alternar(alvo: AlvoFavorito): Promise<boolean> {
    let favoritado = false;
    await this.db.withTransactionAsync(async () => {
      favoritado = await this.alternarNaTransacao(alvo);
    });
    return favoritado;
  }

  async alternarNaTransacao({ tipo, id }: AlvoFavorito): Promise<boolean> {
    const coluna = tipo === 'produto' ? 'produto_id' : 'sabor_id';
    const removido = await this.db.runAsync(
      `DELETE FROM favoritos WHERE usuario_id IS ? AND ${coluna} = ?`,
      this.usuarioId,
      id,
    );
    if (removido.changes > 0) return false;

    await this.db.runAsync(
      `INSERT INTO favoritos (usuario_id, ${coluna}) VALUES (?, ?)`,
      this.usuarioId,
      id,
    );
    return true;
  }

  async importarDoServidor(remotos: FavoritoImportado[]): Promise<void> {
    const usuarioId = this.usuarioId;
    if (!usuarioId) return;

    const naFila = await new SqliteFilaRepository(this.db).listar(usuarioId);
    const protegidos = new Set(
      naFila
        .filter((i) => i.operacao === 'adicionar_favorito' || i.operacao === 'remover_favorito')
        .map((i) => chave(i.payload as AlvoFavorito)),
    );
    const chavesRemotas = new Set(remotos.map(chave));

    const locais = await this.db.getAllAsync<FavoritoLocalRow>(
      'SELECT id, produto_id, sabor_id FROM favoritos WHERE usuario_id = ?',
      usuarioId,
    );
    const chavesLocais = new Set<string>();
    for (const linha of locais) {
      const alvo = alvoDe(linha);
      if (!alvo) continue;
      const k = chave(alvo);
      chavesLocais.add(k);
      if (!chavesRemotas.has(k) && !protegidos.has(k)) {
        await this.db.runAsync('DELETE FROM favoritos WHERE id = ?', linha.id);
      }
    }

    const novos = remotos
      .filter((r) => !chavesLocais.has(chave(r)) && !protegidos.has(chave(r)))
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
    for (const novo of novos) {
      const tabela = novo.tipo === 'produto' ? 'produtos' : 'sabores';
      const coluna = novo.tipo === 'produto' ? 'produto_id' : 'sabor_id';
      await this.db.runAsync(
        `INSERT OR IGNORE INTO favoritos (usuario_id, ${coluna}, criado_em)
         SELECT ?, id, ? FROM ${tabela} WHERE id = ?`,
        usuarioId,
        novo.criadoEm,
        novo.id,
      );
    }
  }
}