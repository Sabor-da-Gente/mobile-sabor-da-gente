import { router } from 'expo-router';
import { useState } from 'react';
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

const sabores = [
  {
    nome: 'Calabresa',
    descricao: 'Molho de tomate, queijo, calabresa e cebola.',
    preco: 45,
  },
  {
    nome: 'Frango com Catupiry',
    descricao: 'Molho de tomate, queijo, frango e catupiry.',
    preco: 45,
  },
  {
    nome: 'Portuguesa',
    descricao: 'Queijo, presunto, ovo, cebola, tomate e azeitona.',
    preco: 48,
  },
];


export default function PizzasScreen() {
  const [saboresSelecionados, setSaboresSelecionados] = useState<string[]>([]);
  const { adicionarItem, itens } = useCarrinho();

  const precoPizza =
    saboresSelecionados.length > 0
      ? Math.max(
          ...saboresSelecionados.map(
            (nome) =>
              sabores.find((sabor) => sabor.nome === nome)?.preco ?? 0
          )
        )
      : 0;

  const quantidadeCarrinho = itens.reduce(
    (soma, item) => soma + item.quantidade,
    0
  );

  function selecionarSabor(nome: string) {
    if (saboresSelecionados.includes(nome)) {
      setSaboresSelecionados((atuais) =>
        atuais.filter((sabor) => sabor !== nome)
      );
      return;
    }

    if (saboresSelecionados.length >= 2) {
      Alert.alert('Limite de sabores', 'Você pode escolher até 2 sabores.');
      return;
    }

    setSaboresSelecionados((atuais) => [...atuais, nome]);
  }

  function adicionarPizza() {
    if (saboresSelecionados.length === 0) {
      Alert.alert(
        'Escolha um sabor',
        'Selecione pelo menos um sabor para continuar.'
      );
      return;
    }

    adicionarItem({
      nome: 'Pizza Grande',
      sabores: [...saboresSelecionados],
      preco: precoPizza,
    });

    Alert.alert(
      'Pizza adicionada!',
      `${saboresSelecionados.join(' e ')} foi adicionada ao carrinho.`,
      [
        { text: 'Continuar escolhendo', style: 'cancel' },
        {
          text: 'Ver carrinho',
          onPress: () => router.push('/carrinho'),
        },
      ]
    );

    setSaboresSelecionados([]);
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
            <Text style={styles.title}>Pizzas Grandes 🍕</Text>

            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => router.push('/carrinho')}
            >
              <Text style={styles.cartButtonText}>
                🛒 {quantidadeCarrinho > 0 ? `(${quantidadeCarrinho})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Escolha 1 ou 2 sabores</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Monte sua pizza</Text>

          <Text style={styles.infoText}>
            Você pode escolher até 2 sabores para sua pizza.
          </Text>

          <Text style={styles.selectionText}>
            {saboresSelecionados.length} de 2 sabores selecionados
          </Text>

          <Text style={styles.totalText}>
            Total: {formatarPreco(precoPizza)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Sabores</Text>

        {sabores.map((sabor) => {
          const selecionado = saboresSelecionados.includes(sabor.nome);

          return (
            <TouchableOpacity
              key={sabor.nome}
              style={[
                styles.pizzaCard,
                selecionado && styles.pizzaCardSelected,
              ]}
              onPress={() => selecionarSabor(sabor.nome)}
            >
              <View style={styles.pizzaIcon}>
                <Text style={styles.pizzaEmoji}>🍕</Text>
              </View>

              <View style={styles.pizzaInfo}>
                <Text style={styles.pizzaName}>{sabor.nome}</Text>

                <Text style={styles.pizzaDescription}>
                  {sabor.descricao}
                </Text>

                <Text style={styles.pizzaPrice}>
                  {formatarPreco(sabor.preco)}
                </Text>
              </View>

              <View
                style={[
                  styles.checkbox,
                  selecionado && styles.checkboxSelected,
                ]}
              >
                {selecionado && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[
            styles.addButton,
            saboresSelecionados.length === 0 && styles.addButtonDisabled,
          ]}
          onPress={adicionarPizza}
        >
          <Text style={styles.addButtonText}>
            Adicionar ao carrinho · {formatarPreco(precoPizza)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewCartButton}
          onPress={() => router.push('/carrinho')}
        >
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
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B1E1E',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  cartButton: {
    backgroundColor: '#8B1E1E',
    paddingHorizontal: 13,
    paddingVertical: 10,
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
    fontSize: 19,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFE9D6',
  },
  selectionText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F4C542',
  },
  totalText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionTitle: {
    marginHorizontal: 20,
    marginTop: 26,
    marginBottom: 14,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D2D2D',
  },
  pizzaCard: {
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
  pizzaCardSelected: {
    borderWidth: 2,
    borderColor: '#8B1E1E',
    backgroundColor: '#FFF4E8',
  },
  pizzaIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#FFF1D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pizzaEmoji: {
    fontSize: 34,
  },
  pizzaInfo: {
    flex: 1,
  },
  pizzaName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D2D2D',
    marginBottom: 5,
  },
  pizzaDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#777777',
    marginBottom: 8,
  },
  pizzaPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#8B1E1E',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#D0C5BA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkboxSelected: {
    backgroundColor: '#8B1E1E',
    borderColor: '#8B1E1E',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 17,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#8B1E1E',
  },
  addButtonDisabled: {
    opacity: 0.65,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  viewCartButton: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    alignItems: 'center',
  },
  viewCartText: {
    color: '#8B1E1E',
    fontSize: 15,
    fontWeight: 'bold',
  },
});