import type { Href } from 'expo-router';

import type { Categoria } from '@/models/Categoria';

export function rotaDaCategoria(categoria: Categoria): Href {
  return { pathname: '/categoria/[id]', params: { id: categoria.slug } };
}
