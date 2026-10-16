import type { Href } from 'expo-router';

import type { Categoria } from '@/models/Categoria';

export function rotaDaCategoria(categoria: Categoria): Href {
  if (categoria.ehPizza) return '/pizzas';
  return { pathname: '/categoria/[slug]', params: { slug: categoria.slug } };
}
