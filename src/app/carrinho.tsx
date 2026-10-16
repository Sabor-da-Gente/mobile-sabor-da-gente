import { router } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCarrinho } from '@/context/CarrinhoContext';
import { TAXA_ENTREGA_CENTAVOS } from '@/services/PrecoService';
import { confirmar } from '@/utils/alerta';
import { formatarCentavos } from '@/utils/dinheiro';
import { voltarOu } from '@/utils/rotas';

export default function CarrinhoScreen() {
  const {
    itens,
    carregando,
    aumentarQuantidade,
    diminuirQuantidade,
    removerItem,
    limparCarrinho,
    subtotal,
  } = useCarrinho();

  async function confirmarLimpeza() {
    const confirmou = await confirmar(
      'Limpar carrinho',
      'Deseja remover todos os itens?',
      'Limpar',
    );

    if (confirmou) {
      limparCarrinho();
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#8B1E1E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => voltarOu('/cardapio')}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Meu carrinho 🛒</Text>
        <Text style={styles.subtitle}>Confira seus produtos antes de continuar.</Text>

        {itens.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🍕</Text>
            <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
            <Text style={styles.emptyText}>
              Escolha suas pizzas favoritas para começar.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/cardapio')}
            >
              <Text style={styles.primaryButtonText}>Ver cardápio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {itens.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.nome}</Text>
                    {item.sabores.length > 0 && (
                      <Text style={styles.itemDescription}>
                        Sabores: {item.sabores.join(' e ')}
                      </Text>
                    )}
                    {item.extras().length > 0 && (
                      <Text style={styles.itemDescription}>{item.extras().join(' · ')}</Text>
                    )}
                    {item.observacao && (
                      <Text style={styles.itemDescription}>Obs.: {item.observacao}</Text>
                    )}
                    <Text style={styles.unitPrice}>
                      {formatarCentavos(item.precoUnitario())} por unidade
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => removerItem(item.id)}>
                    <Text style={styles.remove}>Remover</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.itemFooter}>
                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => diminuirQuantidade(item.id)}
                      accessibilityLabel="Diminuir quantidade"
                    >
                      <Text style={styles.quantityButtonText}>−</Text>
                    </TouchableOpacity>

                    <Text style={styles.quantity}>{item.quantidade}</Text>

                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => aumentarQuantidade(item.id)}
                      accessibilityLabel="Aumentar quantidade"
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.itemTotal}>
                    {formatarCentavos(item.subtotal())}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatarCentavos(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Taxa de entrega</Text>
                <Text style={styles.summaryValue}>{formatarCentavos(TAXA_ENTREGA_CENTAVOS)}</Text>
              </View>
              <Text style={styles.summaryHint}>Retirada no estabelecimento não paga taxa.</Text>
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>Total com entrega</Text>
                <Text style={styles.total}>
                  {formatarCentavos(subtotal + TAXA_ENTREGA_CENTAVOS)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/finalizar-pedido')}
            >
              <Text style={styles.primaryButtonText}>Continuar pedido</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={confirmarLimpeza}
            >
              <Text style={styles.clearButtonText}>Limpar carrinho</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  content: { padding: 20, paddingBottom: 36 },
  back: { fontSize: 16, color: '#8B1E1E', fontWeight: '600', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#8B1E1E', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#666666', marginBottom: 24 },
  empty: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 26,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F0E3D5',
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 19, fontWeight: 'bold', color: '#2D2D2D', textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#777777', textAlign: 'center', marginTop: 8, marginBottom: 20 },
  itemCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E3D5',
    marginBottom: 14,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: 'bold', color: '#2D2D2D' },
  itemDescription: { fontSize: 13, color: '#777777', marginTop: 5 },
  unitPrice: { fontSize: 14, color: '#8B1E1E', fontWeight: '600', marginTop: 8 },
  remove: { fontSize: 13, color: '#B42318', fontWeight: '600' },
  itemFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E3D5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF1D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: { fontSize: 22, color: '#8B1E1E', fontWeight: 'bold' },
  quantity: { fontSize: 16, fontWeight: 'bold', color: '#2D2D2D' },
  itemTotal: { fontSize: 17, fontWeight: 'bold', color: '#2D2D2D' },
  summary: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginTop: 6,
    marginBottom: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F0E3D5',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 15, color: '#555555' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
  summaryHint: { fontSize: 12, color: '#777777' },
  summaryTotalRow: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0E3D5' },
  summaryTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#2D2D2D' },
  total: { fontSize: 21, fontWeight: 'bold', color: '#8B1E1E' },
  primaryButton: { backgroundColor: '#8B1E1E', padding: 16, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  clearButton: { padding: 15, alignItems: 'center', marginTop: 4 },
  clearButtonText: { color: '#B42318', fontWeight: '600', fontSize: 14 },
});