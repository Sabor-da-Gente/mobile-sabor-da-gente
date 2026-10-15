import { useLocalSearchParams } from 'expo-router';

import { TelaCategoria } from '@/components/tela-categoria';

export default function CategoriaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <TelaCategoria categoriaId={id} />;
}