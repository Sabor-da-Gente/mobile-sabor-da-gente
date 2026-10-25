import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Paleta } from '@/constants/paleta';
import { usePedidoRepository } from '@/hooks/use-repositorios';
import { listarPedidos } from '@/services/pedidoService';
import type { Pedido } from '@/types';
import { formatarCentavos } from '@/utils/dinheiro';
import { COR_STATUS, ROTULO_STATUS, formatarDataHora } from '@/utils/pedido';
import { voltarOu } from '@/utils/rotas';

export default function PedidosScreen() {
  const pedidoRepo = usePedidoRepository();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);

    try {
      setPedidos(await listarPedidos(pedidoRepo));
    } catch (e) {
      console.error('Erro ao carregar pedidos:', e);
      setErro('Não foi possível carregar seus pedidos.');
    } finally {
      setCarregando(false);
    }
  }, [pedidoRepo]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => voltarOu('/')}>
          <Text style={styles.voltar}>‹ Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Meus pedidos 📦</Text>
        <Text style={styles.subtitulo}>Acompanhe os pedidos da sua conta.</Text>

        {carregando && (
          <ActivityIndicator size="large" color={Paleta.primaria} style={styles.loading} />
        )}

        {!carregando && erro && (
          <View style={styles.vazio}>
            <Text style={styles.vazioTexto}>{erro}</Text>

            <TouchableOpacity style={styles.botao} onPress={carregar}>
              <Text style={styles.botaoTexto}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && pedidos.length === 0 && (
          <View style={styles.vazio}>
            <Text style={styles.vazioIcone}>🍕</Text>
            <Text style={styles.vazioTitulo}>Nenhum pedido ainda</Text>
            <Text style={styles.vazioTexto}>Faça seu primeiro pedido pelo cardápio.</Text>

            <TouchableOpacity style={styles.botao} onPress={() => router.push('/cardapio')}>
              <Text style={styles.botaoTexto}>Ver cardápio</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando &&
          !erro &&
          pedidos.map((pedido) => {
            const quantidade = pedido.itens.reduce((soma, item) => soma + item.quantidade, 0);

            return (
              <TouchableOpacity
                key={pedido.id}
                style={styles.cartao}
                onPress={() => router.push(`/pedido/${pedido.id}`)}
              >
                <View style={styles.cartaoTopo}>
                  <Text style={styles.numero}>Pedido #{pedido.numero}</Text>

                  <View style={[styles.status, { backgroundColor: COR_STATUS[pedido.status] }]}>
                    <Text style={styles.statusTexto}>{ROTULO_STATUS[pedido.status]}</Text>
                  </View>
                </View>

                <Text style={styles.data}>{formatarDataHora(pedido.criadoEm)}</Text>

                <View style={styles.cartaoBase}>
                  <Text style={styles.itens}>
                    {quantidade} {quantidade === 1 ? 'item' : 'itens'}
                  </Text>

                  <Text style={styles.total}>{formatarCentavos(pedido.totalCentavos)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fundo },
  content: { padding: 20, paddingBottom: 36 },
  voltar: { fontSize: 16, color: Paleta.primaria, fontWeight: '600', marginBottom: 18 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Paleta.primaria, marginBottom: 6 },
  subtitulo: { fontSize: 15, color: Paleta.textoSecundario, marginBottom: 22 },
  loading: { marginTop: 40 },
  vazio: {
    alignItems: 'center',
    backgroundColor: Paleta.superficie,
    borderRadius: 18,
    padding: 26,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  vazioIcone: { fontSize: 44, marginBottom: 10 },
  vazioTitulo: { fontSize: 18, fontWeight: 'bold', color: Paleta.texto, marginBottom: 6 },
  vazioTexto: { fontSize: 14, color: Paleta.textoSuave, textAlign: 'center', marginBottom: 18 },
  botao: {
    backgroundColor: Paleta.primaria,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  botaoTexto: { color: Paleta.textoSobrePrimaria, fontSize: 15, fontWeight: 'bold' },
  cartao: {
    backgroundColor: Paleta.superficie,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Paleta.borda,
    marginBottom: 12,
  },
  cartaoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  numero: { fontSize: 17, fontWeight: 'bold', color: Paleta.texto },
  status: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusTexto: { color: Paleta.textoSobrePrimaria, fontSize: 12, fontWeight: 'bold' },
  data: { fontSize: 13, color: Paleta.textoSuave, marginTop: 6 },
  cartaoBase: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Paleta.borda,
    marginTop: 12,
    paddingTop: 12,
  },
  itens: { fontSize: 14, color: Paleta.textoSecundario },
  total: { fontSize: 17, fontWeight: 'bold', color: Paleta.primaria },
});