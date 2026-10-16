import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Carregando, ErroTela } from '@/components/estado-tela';
import { useCarrinho } from '@/context/CarrinhoContext';
import { useConsulta } from '@/hooks/use-consulta';
import { useCardapioRepository } from '@/hooks/use-repositorios';
import { formatarCentavos } from '@/utils/dinheiro';
import { rotaDaCategoria } from '@/utils/rotas';

export default function HomeScreen() {
  const repo = useCardapioRepository();
  const { itens } = useCarrinho();
  const quantidadeCarrinho = itens.reduce((soma, item) => soma + item.quantidade, 0);

  const carregar = useCallback(async () => {
    const [categorias, destaques, opcoesPizza] = await Promise.all([
      repo.listarCategorias(),
      repo.listarDestaques(),
      repo.buscarOpcoesPizza(),
    ]);

    // Cartão da pizza: maior tamanho e o menor preço de sabor nele.
    const maiorTamanho = opcoesPizza.tamanhos.at(-1);
    const precosNoTamanho = maiorTamanho
      ? opcoesPizza.sabores
          .map((s) => s.precoNoTamanho(maiorTamanho.id))
          .filter((p): p is number => p !== undefined)
      : [];
    const pizza = maiorTamanho && precosNoTamanho.length > 0
      ? {
          titulo: `Pizza ${maiorTamanho.nome}`,
          descricao: maiorTamanho.maxSabores > 1
            ? `Escolha até ${maiorTamanho.maxSabores} sabores`
            : 'Escolha seu sabor',
          aPartirDe: Math.min(...precosNoTamanho),
        }
      : undefined;

    return { categorias, produtosDestaque: destaques.produtos, pizza };
  }, [repo]);
  const { dados, carregando, erro } = useConsulta(carregar);

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <Carregando />
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

  const { categorias, produtosDestaque, pizza } = dados;
  const categoriaPizza = categorias.find((c) => c.ehPizza);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá! 👋</Text>
            <Text style={styles.title}>Sabor da Gente</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => router.push('/carrinho')}
              accessibilityLabel="Abrir carrinho"
            >
              <Text style={styles.cartIcon}>🛒</Text>

              {quantidadeCarrinho > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{quantidadeCarrinho}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.logo}>
              <Text style={styles.logoText}>🍕</Text>
            </View>
          </View>
        </View>

        {/* Destaque */}
        <View style={styles.highlight}>
          <Text style={styles.highlightTitle}>
            Seu sabor favorito está aqui! 🍕
          </Text>

          <Text style={styles.highlightText}>
            Escolha seus sabores, monte seu pedido e aproveite.
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/cardapio')}
            >
              <Text style={styles.buttonText}>Ver cardápio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonOutline}
              onPress={() => router.push('/pedidos')}
            >
              <Text style={styles.buttonOutlineText}>Meus pedidos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categorias */}
        <Text style={styles.sectionTitle}>Categorias</Text>

        <View style={styles.categories}>
          {categorias.length === 0 && (
            <Text style={styles.productDescription}>Nenhuma categoria disponível no momento.</Text>
          )}

          {categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={styles.category}
              onPress={() => router.push(rotaDaCategoria(categoria))}
            >
              <Text style={styles.categoryIcon}>{categoria.icone}</Text>
              <Text style={styles.categoryText}>{categoria.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mais pedidos */}
        {(pizza || produtosDestaque.length > 0) && (
          <Text style={styles.sectionTitle}>Mais pedidos</Text>
        )}

        {pizza && categoriaPizza && (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(rotaDaCategoria(categoriaPizza))}
          >
            <View style={styles.productIcon}>
              <Text style={styles.productEmoji}>{categoriaPizza.icone}</Text>
            </View>

            <View style={styles.productInfo}>
              <Text style={styles.productName}>{pizza.titulo}</Text>
              <Text style={styles.productDescription}>{pizza.descricao}</Text>
              <Text style={styles.productPrice}>
                A partir de {formatarCentavos(pizza.aPartirDe)}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {produtosDestaque.map((produto) => {
          const categoria = categorias.find((c) => c.id === produto.categoriaId);
          if (!categoria) return null;
          return (
            <TouchableOpacity
              key={produto.id}
              style={styles.productCard}
              onPress={() => router.push(rotaDaCategoria(categoria))}
            >
              <View style={styles.productIcon}>
                <Text style={styles.productEmoji}>{categoria.icone}</Text>
              </View>

              <View style={styles.productInfo}>
                <Text style={styles.productName}>{produto.nome}</Text>
                {produto.descricao !== '' && (
                  <Text style={styles.productDescription}>{produto.descricao}</Text>
                )}
                <Text style={styles.productPrice}>{formatarCentavos(produto.preco)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
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
    paddingBottom: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  greeting: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 4,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#8B1E1E',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  cartButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E3D5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cartIcon: {
    fontSize: 24,
  },

  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: '#8B1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cartBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F4C542',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoText: {
    fontSize: 28,
  },

  highlight: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#8B1E1E',
  },

  highlightTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },

  highlightText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FFE9D6',
    marginBottom: 20,
  },

  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  button: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F4C542',
  },

  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#5A1717',
  },

  buttonOutline: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F4C542',
  },

  buttonOutlineText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F4C542',
  },

  sectionTitle: {
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 14,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2D2D',
  },

  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },

  category: {
    width: '47%',
    minHeight: 100,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E3D5',
  },

  categoryIcon: {
    fontSize: 30,
    marginBottom: 8,
  },

  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },

  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E3D5',
  },

  productIcon: {
    width: 75,
    height: 75,
    borderRadius: 14,
    backgroundColor: '#FFF1D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  productEmoji: {
    fontSize: 40,
  },

  productInfo: {
    flex: 1,
  },

  productName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 4,
  },

  productDescription: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 8,
  },

  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B1E1E',
  },
});