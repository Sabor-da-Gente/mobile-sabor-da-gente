import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCarrinho } from '@/context/CarrinhoContext';
import { formatarPreco } from '@/utils/dinheiro';

const esfihas = [
  {
    nome: 'Carne',
    descricao: 'Esfiha saborosa com recheio de carne.',
    emoji: '🥟',
    preco: 4,
  },
  {
    nome: 'Frango',
    descricao: 'Esfiha recheada com frango temperado.',
    emoji: '🍗',
    preco: 4,
  },
  {
    nome: 'Queijo',
    descricao: 'Esfiha com recheio cremoso de queijo.',
    emoji: '🧀',
    preco: 4,
  },
  {
    nome: 'Calabresa',
    descricao: 'Esfiha com calabresa bem temperada.',
    emoji: '🍕',
    preco: 4,
  },
];


export default function EsfihasScreen() {
  const { adicionarItem, itens } = useCarrinho();

  const quantidadeCarrinho = itens.reduce(
    (soma, item) => soma + item.quantidade,
    0
  );

  function adicionarEsfiha(nome: string, preco: number) {
    adicionarItem({
      nome: `Esfiha de ${nome}`,
      sabores: [nome],
      preco,
    });

    Alert.alert(
      'Esfiha adicionada!',
      `Esfiha de ${nome} adicionada ao carrinho por ${formatarPreco(preco)}.`,
      [
        { text: 'Continuar escolhendo', style: 'cancel' },
        {
          text: 'Ver carrinho',
          onPress: () => router.push('/carrinho'),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/cardapio')}
          >
            <Text style={styles.backButtonText}>← Voltar ao cardápio</Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Esfihas 🥟</Text>
              <Text style={styles.subtitle}>Escolha seu sabor favorito</Text>
            </View>

            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => router.push('/carrinho')}
            >
              <Text style={styles.cartButtonText}>
                🛒 {quantidadeCarrinho}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Esfihas deliciosas!</Text>
          <Text style={styles.infoText}>
            Escolha entre nossos quatro sabores e adicione seus favoritos ao
            carrinho.
          </Text>
          <Text style={styles.infoPrice}>
            Cada esfiha por R$ 4,00
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Nossos sabores</Text>

        {esfihas.map((esfiha) => (
          <View key={esfiha.nome} style={styles.esfihaCard}>
            <View style={styles.esfihaIcon}>
              <Text style={styles.esfihaEmoji}>{esfiha.emoji}</Text>
            </View>

            <View style={styles.esfihaInfo}>
              <Text style={styles.esfihaName}>{esfiha.nome}</Text>
              <Text style={styles.esfihaDescription}>
                {esfiha.descricao}
              </Text>
              <Text style={styles.esfihaPrice}>
                {formatarPreco(esfiha.preco)}
              </Text>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  adicionarEsfiha(esfiha.nome, esfiha.preco)
                }
              >
                <Text style={styles.addButtonText}>
                  + Adicionar ao carrinho
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.viewCartButton}
          onPress={() => router.push('/carrinho')}
        >
          <Text style={styles.viewCartText}>
            Ver meu carrinho 🛒
          </Text>
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
  esfihaCard: {
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
  esfihaIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#FFF1D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  esfihaEmoji: {
    fontSize: 34,
  },
  esfihaInfo: {
    flex: 1,
  },
  esfihaName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 5,
  },
  esfihaDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#777777',
    marginBottom: 8,
  },
  esfihaPrice: {
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