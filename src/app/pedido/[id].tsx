import { useFocusEffect, useLocalSearchParams } from 'expo-router';
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

import { LinhaDoTempo } from '@/components/linha-do-tempo';
import { Paleta } from '@/constants/paleta';
import { useConsulta } from '@/hooks/use-consulta';
import { usePedidoRepository } from '@/hooks/use-repositorios';
import { buscarPedido, cancelarPedido } from '@/services/pedidoService';
import { finalizado, podeCancelar } from '@/services/StatusService';
import { avisar, confirmar } from '@/utils/alerta';
import { formatarCentavos } from '@/utils/dinheiro';
import { COR_STATUS, ROTULO_STATUS, formatarDataHora } from '@/utils/pedido';
import { voltarOu } from '@/utils/rotas';

const voltar = () => voltarOu('/');

export default function PedidoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pedidoRepo = usePedidoRepository();

  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      return await buscarPedido(pedidoRepo, Number(id));
    } catch (erro) {
      console.error('Erro ao carregar pedido:', erro);
      return null;
    }
  }, [pedidoRepo, id]);
  const { dados, carregando, recarregar } = useConsulta(carregar);
  const pedido = dados ?? undefined;

  // Regra R6: enquanto a tela está aberta, confere o status a cada 5 s.
  const acompanhando = pedido !== undefined && !finalizado(pedido);
  useFocusEffect(
    useCallback(() => {
      if (!acompanhando) return;
      const timer = setInterval(recarregar, 5000);
      return () => clearInterval(timer);
    }, [acompanhando, recarregar]),
  );

  async function cancelar() {
    if (!pedido) return;

    const confirmou = await confirmar(
      'Cancelar pedido',
      `Deseja cancelar o pedido #${pedido.numero}?`,
      'Cancelar pedido',
      'Voltar',
    );

    if (!confirmou) return;

    setProcessando(true);

    try {
      const cancelado = await cancelarPedido(pedidoRepo, pedido.id);

      if (cancelado) {
        avisar('Pedido cancelado', `O pedido #${pedido.numero} foi cancelado.`);
      } else {
        avisar(
          'Não foi possível cancelar',
          'Este pedido já está em andamento e não pode mais ser cancelado.',
        );
      }

      recarregar();
    } catch (erro) {
      console.error('Erro ao cancelar pedido:', erro);
      avisar('Erro', 'Não foi possível cancelar o pedido. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  }

  if (carregando && !pedido) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Paleta.primaria} style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (!pedido) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centro}>
          <Text style={styles.titulo}>Pedido não encontrado</Text>

          <TouchableOpacity style={styles.botaoPrimario} onPress={voltar}>
            <Text style={styles.botaoPrimarioTexto}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={voltar}>
          <Text style={styles.voltar}>‹ Voltar</Text>
        </TouchableOpacity>

        <View style={styles.cabecalho}>
          <View style={styles.cabecalhoTexto}>
            <Text style={styles.titulo}>Pedido #{pedido.numero}</Text>
            <Text style={styles.data}>{formatarDataHora(pedido.criadoEm)}</Text>
          </View>

          <View style={[styles.status, { backgroundColor: COR_STATUS[pedido.status] }]}>
            <Text style={styles.statusTexto}>{ROTULO_STATUS[pedido.status]}</Text>
          </View>
        </View>

        <View style={styles.cartao}>
          <Text style={styles.secao}>Acompanhamento</Text>
          <LinhaDoTempo pedido={pedido} />
          {acompanhando && (
            <Text style={styles.dica}>Atualiza sozinho a cada 5 segundos.</Text>
          )}
        </View>

        <View style={styles.cartao}>
          <Text style={styles.secao}>Cliente</Text>
          <Text style={styles.linha}>{pedido.clienteNome}</Text>
          <Text style={styles.linha}>{pedido.telefone}</Text>
        </View>

        <View style={styles.cartao}>
          <Text style={styles.secao}>Recebimento</Text>
          <Text style={styles.linha}>
            {pedido.tipoEntrega === 'entrega' ? '🛵 Entrega' : '🏪 Retirada no estabelecimento'}
          </Text>
          {pedido.tipoEntrega === 'entrega' && (
            <Text style={styles.linha}>{pedido.endereco}</Text>
          )}
        </View>

        <View style={styles.cartao}>
          <Text style={styles.secao}>Pagamento</Text>
          <Text style={styles.linha}>{pedido.pagamento}</Text>
          {pedido.trocoParaCentavos !== null && (
            <Text style={styles.linha}>
              Troco para: {formatarCentavos(pedido.trocoParaCentavos)}
            </Text>
          )}
        </View>

        <View style={styles.cartao}>
          <Text style={styles.secao}>Produtos</Text>

          {pedido.itens.map((item, indice) => (
            <View key={`${item.nome}-${indice}`} style={styles.item}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemNome}>
                  {item.quantidade}x {item.nome}
                </Text>
                {item.sabores.length > 0 && (
                  <Text style={styles.itemDetalhe}>Sabores: {item.sabores.join(' e ')}</Text>
                )}
                {item.adicionais.length > 0 && (
                  <Text style={styles.itemDetalhe}>
                    {item.adicionais.map((a) => `+ ${a}`).join(' · ')}
                  </Text>
                )}
                {item.observacao && <Text style={styles.itemDetalhe}>Obs.: {item.observacao}</Text>}
              </View>

              <Text style={styles.itemPreco}>
                {formatarCentavos(item.precoCentavos * item.quantidade)}
              </Text>
            </View>
          ))}

          {pedido.taxaEntregaCentavos > 0 && (
            <View style={styles.item}>
              <Text style={styles.itemNome}>Taxa de entrega</Text>
              <Text style={styles.itemPreco}>{formatarCentavos(pedido.taxaEntregaCentavos)}</Text>
            </View>
          )}

          <View style={styles.totalLinha}>
            <Text style={styles.totalRotulo}>Total</Text>
            <Text style={styles.total}>{formatarCentavos(pedido.totalCentavos)}</Text>
          </View>
        </View>

        {podeCancelar(pedido) && (
          <TouchableOpacity
            style={[styles.botaoPrimario, processando && styles.botaoDesabilitado]}
            onPress={cancelar}
            disabled={processando}
          >
            {processando ? (
              <ActivityIndicator color={Paleta.textoSobrePrimaria} />
            ) : (
              <Text style={styles.botaoPrimarioTexto}>Cancelar pedido</Text>
            )}
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fundo },
  content: { padding: 20, paddingBottom: 36 },
  loading: { marginTop: 60 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  voltar: { fontSize: 16, color: Paleta.primaria, fontWeight: '600', marginBottom: 18 },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  cabecalhoTexto: { flex: 1 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: Paleta.primaria, marginBottom: 4 },
  data: { fontSize: 14, color: Paleta.textoSecundario },
  status: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  statusTexto: { color: Paleta.textoSobrePrimaria, fontSize: 13, fontWeight: 'bold' },
  cartao: {
    backgroundColor: Paleta.superficie,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Paleta.borda,
    marginBottom: 14,
  },
  secao: { fontSize: 16, fontWeight: 'bold', color: Paleta.primaria, marginBottom: 10 },
  linha: { fontSize: 15, color: Paleta.texto, marginBottom: 4 },
  dica: { fontSize: 12, color: Paleta.textoSuave, marginTop: 2 },
  botaoDemo: { fontSize: 14, fontWeight: 'bold', color: Paleta.primaria, marginTop: 10 },
  item: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  itemNome: { flex: 1, fontSize: 14, color: Paleta.texto },
  itemInfo: { flex: 1 },
  itemDetalhe: { fontSize: 13, color: Paleta.textoSuave, marginTop: 2 },
  itemPreco: { fontSize: 14, fontWeight: '600', color: Paleta.texto },
  totalLinha: {
    borderTopWidth: 1,
    borderTopColor: Paleta.borda,
    paddingTop: 12,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRotulo: { fontSize: 15, color: Paleta.textoSecundario },
  total: { fontSize: 21, fontWeight: 'bold', color: Paleta.primaria },
  botaoPrimario: {
    backgroundColor: Paleta.primaria,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoPrimarioTexto: { color: Paleta.textoSobrePrimaria, fontSize: 16, fontWeight: 'bold' },
  botaoDesabilitado: { backgroundColor: Paleta.desabilitado },
  botaoSecundario: { padding: 15, alignItems: 'center', marginTop: 4 },
  botaoSecundarioTexto: { color: '#B42318', fontSize: 14, fontWeight: '600' },
});