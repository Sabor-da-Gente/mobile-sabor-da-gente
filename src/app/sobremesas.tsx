import { router } from 'expo-router';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCarrinho } from '@/context/CarrinhoContext';
import { formatarPreco } from '@/utils/dinheiro';

const sobremesas = [
  {
    nome: 'Brigadeiro',
    descricao: 'Doce de chocolate coberto com granulado.',
    emoji: '🍫',
    preco: 3,
  },
  {
    nome: 'Pudim',
    descricao: 'Pudim de leite condensado com calda de caramelo.',
    emoji: '🍮',
    preco: 6,
  },
  {
    nome: 'Mousse de chocolate',
    descricao: 'Sobremesa cremosa e deliciosa de chocolate.',
    emoji: '🍨',
    preco: 5,
  },
];


export default function SobremesasScreen() {
  const { adicionarItem, itens } = useCarrinho();

  const quantidadeCarrinho = itens.reduce(
    (soma, item) => soma + item.quantidade,
    0,
  );

  function adicionarSobremesa(nome: string, preco: number) {
    adicionarItem({
      nome,
      sabores: [nome],
      preco,
    });

    Alert.alert(
      'Sobremesa adicionada!',
      `${nome} foi adicionada ao carrinho por ${formatarPreco(preco)}.`,
      [
        {
          text: 'Continuar escolhendo',
          style: 'cancel',
        },
        {
          text: 'Ver carrinho',
          onPress: () => router.push('/carrinho'),
        },
      ],
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
            <Text style={styles.backButtonText}>
              ← Voltar ao cardápio
            </Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Sobremesas 🍰</Text>
              <Text style={styles.subtitle}>
                Deixe seu pedido ainda mais doce!
              </Text>
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
          <Text style={styles.infoTitle}>Uma doce tentação!</Text>
          <Text style={styles.infoText}>
            Escolha sua sobremesa favorita para finalizar seu pedido.
          </Text>
          <Text style={styles.infoPrice}>
            Sobremesas a partir de R$ 3,00
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Nossas sobremesas</Text>

        {sobremesas.map((sobremesa) => (
          <View key={sobremesa.nome} style={styles.sobremesaCard}>
            <View style={styles.sobremesaIcon}>
              <Text style={styles.sobremesaEmoji}>
                {sobremesa.emoji}
              </Text>
            </View>

            <View style={styles.sobremesaInfo}>
              <Text style={styles.sobremesaName}>
                {sobremesa.nome}
              </Text>

              <Text style={styles.sobremesaDescription}>
                {sobremesa.descricao}
              </Text>

              <Text style={styles.sobremesaPrice}>
                {formatarPreco(sobremesa.preco)}
              </Text>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  adicionarSobremesa(
                    sobremesa.nome,
                    sobremesa.preco,
                  )
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
  sobremesaCard: {
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
  sobremesaIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#FFF1D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sobremesaEmoji: {
    fontSize: 34,
  },
  sobremesaInfo: {
    flex: 1,
  },
  sobremesaName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 5,
  },
  sobremesaDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#777777',
    marginBottom: 8,
  },
  sobremesaPrice: {
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
