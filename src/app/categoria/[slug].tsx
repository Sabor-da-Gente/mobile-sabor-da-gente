import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Carregando, ErroTela } from '@/components/estado-tela';
import { useCarrinho } from '@/context/CarrinhoContext';
import { useConsulta } from '@/hooks/use-consulta';
import { useCardapioRepository } from '@/hooks/use-repositorios';
import type { Produto } from '@/models/Produto';
import { confirmar } from '@/utils/alerta';
import { formatarCentavos } from '@/utils/dinheiro';

export default function CategoriaScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const repo = useCardapioRepository();
  const { adicionarItem, itens } = useCarrinho();

  const carregar = useCallback(async () => {
    const [categoria, produtos] = await Promise.all([
      repo.buscarCategoria(slug),
      repo.listarProdutos({ categoriaSlug: slug }),
    ]);
    return { categoria, produtos };
  }, [repo, slug]);
  const { dados, carregando, erro } = useConsulta(carregar);

  const quantidadeCarrinho = itens.reduce((soma, item) => soma + item.quantidade, 0);

  async function adicionarProduto(produto: Produto) {
    // O carrinho ainda guarda reais (muda na Etapa 2); o banco guarda centavos.
    adicionarItem({ nome: produto.nome, sabores: [], preco: produto.preco / 100 });

    const verCarrinho = await confirmar(
      'Adicionado ao carrinho!',
      `${produto.nome} por ${formatarCentavos(produto.preco)}.`,
      'Ver carrinho',
      'Continuar escolhendo',
    );
    if (verCarrinho) router.push('/carrinho');
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/cardapio');
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <Carregando />
      </SafeAreaView>
    );
  }

  if (erro || !dados?.categoria) {
    return (
      <SafeAreaView style={styles.container}>
        <ErroTela erro={erro} titulo={erro ? undefined : 'Categoria não encontrada'} />
      </SafeAreaView>
    );
  }

  const { categoria, produtos } = dados;
  const menorPreco = produtos.length > 0 ? Math.min(...produtos.map((p) => p.preco)) : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={voltar}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {categoria.nome} {categoria.icone}
              </Text>
              <Text style={styles.subtitle}>Escolha seu favorito</Text>
            </View>

            <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/carrinho')}>
              <Text style={styles.cartButtonText}>🛒 {quantidadeCarrinho}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {menorPreco !== undefined && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{categoria.nome} da casa!</Text>
            <Text style={styles.infoText}>
              {produtos.length} {produtos.length === 1 ? 'opção' : 'opções'} para adicionar ao seu
              pedido.
            </Text>
            <Text style={styles.infoPrice}>A partir de {formatarCentavos(menorPreco)}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Opções</Text>

        {produtos.length === 0 && (
          <Text style={styles.emptyText}>Nenhum item disponível nesta categoria no momento.</Text>
        )}

        {produtos.map((produto) => (
          <View key={produto.id} style={styles.produtoCard}>
            <View style={styles.produtoIcon}>
              <Text style={styles.produtoEmoji}>{categoria.icone}</Text>
            </View>

            <View style={styles.produtoInfo}>
              <Text style={styles.produtoName}>{produto.nome}</Text>
              {produto.descricao !== '' && (
                <Text style={styles.produtoDescription}>{produto.descricao}</Text>
              )}
              <Text style={styles.produtoPrice}>{formatarCentavos(produto.preco)}</Text>

              <TouchableOpacity style={styles.addButton} onPress={() => adicionarProduto(produto)}>
                <Text style={styles.addButtonText}>+ Adicionar ao carrinho</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.viewCartButton} onPress={() => router.push('/carrinho')}>
          <Text style={styles.viewCartText}>Ver meu carrinho 🛒</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  content: {
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
    borderRadius: 10,
    backgroundColor: '#F4C542',
  },
  backButtonText: {
    color: '#8B1E1E',
    fontSize: 15,
    fontWeight: 'bold',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B1E1E',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
  },
  cartButton: {
    backgroundColor: '#8B1E1E',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cartButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#8B1E1E',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#FFE9D6',
  },
  infoPrice: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#F4C542',
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginTop: 26,
    marginBottom: 14,
    fontSize: 21,
    fontWeight: 'bold',
    color: '#2D2D2D',
  },
  emptyText: {
    marginHorizontal: 20,
    fontSize: 14,
    color: '#777777',
  },
  produtoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E3D5',
  },
  produtoIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#FFF1D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  produtoEmoji: {
    fontSize: 34,
  },
  produtoInfo: {
    flex: 1,
  },
  produtoName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 5,
  },
  produtoDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#777777',
    marginBottom: 8,
  },
  produtoPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B1E1E',
    marginBottom: 10,
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#8B1E1E',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  viewCartButton: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    alignItems: 'center',
  },
  viewCartText: {
    color: '#8B1E1E',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
