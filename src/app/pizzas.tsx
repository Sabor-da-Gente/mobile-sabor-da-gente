import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Carregando, ErroTela } from '@/components/estado-tela';
import { useCarrinho } from '@/context/CarrinhoContext';
import { useConsulta } from '@/hooks/use-consulta';
import { useCardapioRepository } from '@/hooks/use-repositorios';
import type { Sabor, Tamanho } from '@/models/Pizza';
import { avisar, confirmar } from '@/utils/alerta';
import { formatarCentavos } from '@/utils/dinheiro';

// Por enquanto usa só o maior tamanho; tamanho, massa e adicionais entram na Etapa 2.
export default function PizzasScreen() {
  const repo = useCardapioRepository();
  const carregar = useCallback(() => repo.buscarOpcoesPizza(), [repo]);
  const { dados, carregando, erro } = useConsulta(carregar);

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <Carregando texto="Carregando sabores..." />
      </SafeAreaView>
    );
  }

  const tamanho = dados?.tamanhos.at(-1);
  if (erro || !dados || !tamanho) {
    return (
      <SafeAreaView style={styles.container}>
        <ErroTela erro={erro} titulo={erro ? undefined : 'Nenhum tamanho de pizza cadastrado'} />
      </SafeAreaView>
    );
  }

  const sabores = dados.sabores.filter((s) => s.disponivelNo(tamanho.id));
  return <EscolherSabores tamanho={tamanho} sabores={sabores} />;
}

function EscolherSabores({ tamanho, sabores }: { tamanho: Tamanho; sabores: Sabor[] }) {
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const { adicionarItem, itens } = useCarrinho();
  const max = tamanho.maxSabores;

  const preco = (sabor: Sabor) => sabor.precoNoTamanho(tamanho.id) ?? 0;
  const saboresEscolhidos = sabores.filter((s) => selecionados.includes(s.id));

  // Regra R1: vale o preço do sabor mais caro.
  const precoPizza =
    saboresEscolhidos.length > 0 ? Math.max(...saboresEscolhidos.map(preco)) : 0;

  const quantidadeCarrinho = itens.reduce(
    (soma, item) => soma + item.quantidade,
    0
  );

  function selecionarSabor(id: number) {
    if (selecionados.includes(id)) {
      setSelecionados((atuais) => atuais.filter((s) => s !== id));
      return;
    }

    if (selecionados.length >= max) {
      avisar('Limite de sabores', `Você pode escolher até ${max} sabores.`);
      return;
    }

    setSelecionados((atuais) => [...atuais, id]);
  }

  async function adicionarPizza() {
    if (saboresEscolhidos.length === 0) {
      avisar('Escolha um sabor', 'Selecione pelo menos um sabor para continuar.');
      return;
    }

    const nomes = saboresEscolhidos.map((s) => s.nome);
    // O carrinho ainda guarda reais (muda na Etapa 2); o banco guarda centavos.
    adicionarItem({
      nome: `Pizza ${tamanho.nome}`,
      sabores: nomes,
      preco: precoPizza / 100,
    });
    setSelecionados([]);

    const verCarrinho = await confirmar(
      'Pizza adicionada!',
      `${nomes.join(' e ')} foi adicionada ao carrinho.`,
      'Ver carrinho',
      'Continuar escolhendo',
    );
    if (verCarrinho) router.push('/carrinho');
  }

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/cardapio');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={voltar}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <Text style={styles.title}>Pizza {tamanho.nome} 🍕</Text>

            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => router.push('/carrinho')}
            >
              <Text style={styles.cartButtonText}>
                🛒 {quantidadeCarrinho > 0 ? `(${quantidadeCarrinho})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            {max > 1 ? `Escolha de 1 a ${max} sabores` : 'Escolha 1 sabor'} · {tamanho.fatias} fatias
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Monte sua pizza</Text>

          <Text style={styles.infoText}>
            Com mais de um sabor, vale o preço do sabor mais caro.
          </Text>

          <Text style={styles.selectionText}>
            {selecionados.length} de {max} sabores selecionados
          </Text>

          <Text style={styles.totalText}>
            Total: {formatarCentavos(precoPizza)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Sabores</Text>

        {sabores.map((sabor) => {
          const selecionado = selecionados.includes(sabor.id);

          return (
            <TouchableOpacity
              key={sabor.id}
              style={[
                styles.pizzaCard,
                selecionado && styles.pizzaCardSelected,
              ]}
              onPress={() => selecionarSabor(sabor.id)}
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
                  {formatarCentavos(preco(sabor))}
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
            selecionados.length === 0 && styles.addButtonDisabled,
          ]}
          onPress={adicionarPizza}
        >
          <Text style={styles.addButtonText}>
            Adicionar ao carrinho · {formatarCentavos(precoPizza)}
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