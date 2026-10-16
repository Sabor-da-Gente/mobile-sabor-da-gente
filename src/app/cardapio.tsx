import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Carregando, ErroTela } from '@/components/estado-tela';
import { useConsulta } from '@/hooks/use-consulta';
import { useCardapioRepository } from '@/hooks/use-repositorios';
import type { Categoria } from '@/models/Categoria';
import { rotaDaCategoria } from '@/utils/rotas';

export default function CardapioScreen() {
  const repo = useCardapioRepository();

  const carregar = useCallback(async () => {
    const [categorias, produtos, opcoesPizza] = await Promise.all([
      repo.listarCategorias(),
      repo.listarProdutos(),
      repo.buscarOpcoesPizza(),
    ]);
    const totalPorCategoria = new Map<number, number>();
    for (const p of produtos) {
      totalPorCategoria.set(p.categoriaId, (totalPorCategoria.get(p.categoriaId) ?? 0) + 1);
    }
    const maxSabores = Math.max(0, ...opcoesPizza.tamanhos.map((t) => t.maxSabores));
    return { categorias, totalPorCategoria, totalSabores: opcoesPizza.sabores.length, maxSabores };
  }, [repo]);
  const { dados, carregando, erro } = useConsulta(carregar);

  function descricao(categoria: Categoria): string {
    if (!dados) return '';
    if (categoria.ehPizza) {
      const ate = dados.maxSabores > 1 ? `até ${dados.maxSabores} sabores` : '1 sabor';
      return `Monte a sua: ${ate} · ${dados.totalSabores} sabores`;
    }
    const total = dados.totalPorCategoria.get(categoria.id) ?? 0;
    return total === 1 ? '1 opção' : `${total} opções`;
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <Carregando texto="Carregando cardápio..." />
      </SafeAreaView>
    );
  }

  if (erro || !dados) {
    return (
      <SafeAreaView style={styles.container}>
        <ErroTela erro={erro} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.botaoVoltar} onPress={() => router.replace('/')}>
            <Text style={styles.botaoVoltarTexto}>← Voltar ao início</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Cardápio 🍕</Text>

          <Text style={styles.subtitle}>Escolha uma categoria</Text>
        </View>

        <View style={styles.categories}>
          {dados.categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={styles.category}
              onPress={() => router.push(rotaDaCategoria(categoria))}
            >
              <Text style={styles.icon}>{categoria.icone}</Text>
              <Text style={styles.categoryTitle}>{categoria.nome}</Text>
              <Text style={styles.categoryDescription}>{descricao(categoria)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },

  botaoVoltar: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    backgroundColor: '#F4C542',
  },

  botaoVoltarTexto: {
    color: '#8B1E1E',
    fontSize: 15,
    fontWeight: 'bold',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B1E1E',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 16,
    color: '#666666',
  },

  categories: {
    padding: 20,
    gap: 14,
  },

  category: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E3D5',
  },

  icon: {
    fontSize: 36,
    marginBottom: 10,
  },

  categoryTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 5,
  },

  categoryDescription: {
    fontSize: 14,
    color: '#777777',
  },
});
