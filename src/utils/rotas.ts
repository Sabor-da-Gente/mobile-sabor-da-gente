import type { Href } from 'expo-router';

import type { Categoria } from '@/models/Categoria';

export function rotaDaCategoria(categoria: Categoria): Href {
  if (categoria.ehPizza) return '/monte-sua-pizza';
  return { pathname: '/categoria/[id]', params: { id: categoria.slug } };
}
