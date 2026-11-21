import type { AlvoFavorito } from '@/repositories/FavoritoRepository';
import { supabase } from '@/services/supabase';

import { erroAmigavel } from './util';

type LinhaFavorito = {
  produto_id: number | null;
  sabor_id: number | null;
  criado_em: string;
};

export class SupabaseFavoritoRepository {
  async listarDe(usuarioId: string): Promise<(AlvoFavorito & { criadoEm: string })[]> {
    const { data, error } = await supabase
      .from('favoritos')
      .select('produto_id, sabor_id, criado_em')
      .eq('usuario_id', usuarioId);
    if (error) throw erroAmigavel(error);

    const lista: (AlvoFavorito & { criadoEm: string })[] = [];
    for (const linha of data as unknown as LinhaFavorito[]) {
      const criadoEm = new Date(linha.criado_em).toISOString();
      if (linha.produto_id !== null) {
        lista.push({ tipo: 'produto', id: linha.produto_id, criadoEm });
      } else if (linha.sabor_id !== null) {
        lista.push({ tipo: 'sabor', id: linha.sabor_id, criadoEm });
      }
    }
    return lista;
  }
}