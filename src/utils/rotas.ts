import { type Href, router } from 'expo-router';

import type { Categoria } from '@/models/Categoria';

export function rotaDaCategoria(categoria: Categoria): Href {
  if (categoria.ehPizza) return '/monte-sua-pizza';
  return { pathname: '/categoria/[id]', params: { id: categoria.slug } };
}

/** Volta para a tela anterior; aberta por um link (sem anterior), vai para `destino`. */
export function voltarOu(destino: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(destino);
}
