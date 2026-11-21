import type { SQLiteDatabase } from 'expo-sqlite';

import type { AlvoFavorito, Favorito, FavoritoRepository } from '@/repositories/FavoritoRepository';
import { SqliteFavoritoRepository } from '@/repositories/sqlite/SqliteFavoritoRepository';
import { SqliteFilaRepository } from '@/repositories/sqlite/SqliteFilaRepository';
import { falhaDoSupabase } from '@/repositories/supabase/util';
import { avisarNovoItem } from '@/services/sincronizacao/eventos';
import { registrarOperacao } from '@/services/sincronizacao/operacoes';
import { supabase } from '@/services/supabase';

const CODIGO_DUPLICADO = '23505';

function colunaDe(tipo: AlvoFavorito['tipo']): 'produto_id' | 'sabor_id' {
  return tipo === 'produto' ? 'produto_id' : 'sabor_id';
}

export class OfflineFavoritoRepository implements FavoritoRepository {
  private readonly local: SqliteFavoritoRepository;

  constructor(
    private readonly db: SQLiteDatabase,
    private readonly usuarioId: string | null,
  ) {
    this.local = new SqliteFavoritoRepository(db, usuarioId);
  }

  listar(): Promise<Favorito[]> {
    return this.local.listar();
  }

  async alternar(alvo: AlvoFavorito): Promise<boolean> {
    const usuarioId = this.usuarioId;
    if (!usuarioId) return this.local.alternar(alvo);

    let favoritado = false;
    await this.db.withTransactionAsync(async () => {
      favoritado = await this.local.alternarNaTransacao(alvo);
      await this.db.runAsync(
        `DELETE FROM fila_sincronizacao
          WHERE usuario_id = ?
            AND operacao IN ('adicionar_favorito', 'remover_favorito')
            AND status = 'pendente'
            AND json_extract(payload, '$.tipo') = ?
            AND json_extract(payload, '$.id') = ?`,
        usuarioId,
        alvo.tipo,
        alvo.id,
      );
      await new SqliteFilaRepository(this.db).enfileirar(
        usuarioId,
        favoritado ? 'adicionar_favorito' : 'remover_favorito',
        { tipo: alvo.tipo, id: alvo.id },
        { avisar: false },
      );
    });
    avisarNovoItem();
    return favoritado;
  }
}

export function registrarOperacoesFavorito(): void {
  registrarOperacao<AlvoFavorito>('adicionar_favorito', async (alvo, { usuarioId }) => {
    const { error, status } = await supabase
      .from('favoritos')
      .insert({ usuario_id: usuarioId, [colunaDe(alvo.tipo)]: alvo.id });
    if (error && error.code !== CODIGO_DUPLICADO) throw falhaDoSupabase(error, status);
  });

  registrarOperacao<AlvoFavorito>('remover_favorito', async (alvo, { usuarioId }) => {
    const { error, status } = await supabase
      .from('favoritos')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq(colunaDe(alvo.tipo), alvo.id);
    if (error) throw falhaDoSupabase(error, status);
  });
}