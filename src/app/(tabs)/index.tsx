import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listarCategorias } from '@/services/cardapioService';

export default function HomeScreen() {
  const categorias = listarCategorias();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá! 👋</Text>
            <Text style={styles.title}>Sabor da Gente</Text>
          </View>

          <View style={styles.logo}>
            <Text style={styles.logoText}>🍕</Text>
          </View>
        </View>

        <View style={styles.highlight}>
          <Text style={styles.highlightTitle}>
            Seu sabor favorito está aqui! 🍕
          </Text>

          <Text style={styles.highlightText}>
            Escolha seus sabores, monte seu pedido e aproveite.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/cardapio')}
          >
            <Text style={styles.buttonText}>Ver cardápio</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Categorias</Text>

        <View style={styles.categories}>
          {categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={styles.category}
              onPress={() => router.push(`/categoria/${categoria.id}`)}
            >
              <Text style={styles.categoryIcon}>{categoria.emoji}</Text>
              <Text style={styles.categoryText}>{categoria.titulo}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Mais pedidos</Text>

        <TouchableOpacity
          style={styles.productCard}
          onPress={() => router.push('/categoria/pizzas')}
        >
          <View style={styles.productIcon}>
            <Text style={styles.productEmoji}>🍕</Text>
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productName}>Pizzas Grandes</Text>

            <Text style={styles.productDescription}>
              Escolha 1 ou 2 sabores
            </Text>

            <Text style={styles.productPrice}>
              A partir de R$ 45,00
            </Text>
          </View>
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

  button: {
    alignSelf: 'flex-start',
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
    marginBottom: 30,
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