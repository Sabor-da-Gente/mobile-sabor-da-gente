import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCarrinho } from '@/context/CarrinhoContext';
import { usePedidoRepository } from '@/hooks/use-repositorios';
import { calcularTotais } from '@/services/PrecoService';
import { criarPedido } from '@/services/pedidoService';
import type { FormaPagamento, TipoEntrega } from '@/types';
import { avisar, confirmar } from '@/utils/alerta';
import { formatarCentavos, lerCentavos } from '@/utils/dinheiro';

export default function FinalizarPedidoScreen() {
  const { itens, subtotal, limparCarrinho } = useCarrinho();
  const pedidoRepo = usePedidoRepository();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('entrega');
  const [endereco, setEndereco] = useState('');
  const [pagamento, setPagamento] = useState<FormaPagamento>('Pix');
  const [troco, setTroco] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { taxaEntrega, total } = calcularTotais(subtotal, tipoEntrega);

  async function confirmarPedido() {
    if (itens.length === 0) {
      avisar('Carrinho vazio', 'Volte ao cardápio e adicione produtos.');
      return;
    }

    if (!nome.trim() || !telefone.trim()) {
      avisar('Dados incompletos', 'Informe seu nome e telefone para continuar.');
      return;
    }

    if (tipoEntrega === 'entrega' && !endereco.trim()) {
      avisar('Endereço obrigatório', 'Informe o endereço para entrega.');
      return;
    }

    let trocoParaCentavos: number | null = null;
    if (pagamento === 'Dinheiro' && troco.trim()) {
      trocoParaCentavos = lerCentavos(troco);
      if (trocoParaCentavos === null) {
        avisar('Troco inválido', 'Informe o valor do troco, por exemplo 50,00.');
        return;
      }
      if (trocoParaCentavos < total) {
        avisar('Troco insuficiente', `O troco precisa ser de pelo menos ${formatarCentavos(total)}.`);
        return;
      }
    }

    const resumoItens = itens
      .map((item) => `${item.quantidade}x ${item.descricao()}`)
      .join('\n');

    const destino =
      tipoEntrega === 'entrega'
        ? `Entrega: ${endereco.trim()}`
        : 'Retirada no estabelecimento';

    const resumo =
      `Cliente: ${nome.trim()}\n` +
      `Telefone: ${telefone.trim()}\n` +
      `${destino}\n` +
      `Pagamento: ${pagamento}\n` +
      (trocoParaCentavos !== null
        ? `Troco para: ${formatarCentavos(trocoParaCentavos)}\n`
        : '') +
      `\nProdutos:\n${resumoItens}\n\n` +
      (taxaEntrega > 0 ? `Taxa de entrega: ${formatarCentavos(taxaEntrega)}\n` : '') +
      `Total: ${formatarCentavos(total)}`;

    const confirmou = await confirmar(
      'Revise seu pedido',
      `${resumo}\n\nDeseja confirmar o pedido?`,
      'Confirmar pedido',
      'Revisar',
    );

    if (!confirmou) {
      return;
    }

    setEnviando(true);

    try {
      const { pedido, enviado } = await criarPedido(pedidoRepo, {
        clienteNome: nome.trim(),
        telefone: telefone.trim(),
        tipoEntrega,
        endereco: tipoEntrega === 'entrega' ? endereco.trim() : '',
        pagamento,
        trocoParaCentavos,
        // Até a Etapa 4 o pedido guarda massa, adicionais e observação no nome do item.
        itens: itens.map((item) => ({
          nome: [item.nome, ...item.extras(), ...(item.observacao ? [`Obs.: ${item.observacao}`] : [])].join(' · '),
          sabores: item.sabores,
          precoCentavos: item.precoUnitario(),
          quantidade: item.quantidade,
        })),
        subtotalCentavos: subtotal,
        taxaEntregaCentavos: taxaEntrega,
        totalCentavos: total,
      });

      await limparCarrinho();

      avisar(
        `Pedido #${pedido.numero} confirmado!`,
        enviado === false
          ? 'Seu pedido foi salvo no celular, mas não foi possível enviá-lo à pizzaria agora.'
          : 'Seu pedido foi registrado.',
      );

      router.replace('/cardapio');
    } catch (erro) {
      console.error('Erro ao criar pedido:', erro);
      avisar('Erro ao salvar', 'Não foi possível salvar o pedido. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  if (itens.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.title}>Seu carrinho está vazio 🍕</Text>

          <Text style={styles.description}>
            Adicione produtos antes de finalizar o pedido.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/cardapio')}
          >
            <Text style={styles.primaryButtonText}>
              Voltar ao cardápio
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Voltar ao carrinho</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Finalizar pedido 🍕</Text>

        <Text style={styles.description}>
          Preencha os dados para revisar seu pedido.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            1. Dados do cliente
          </Text>

          <Text style={styles.label}>Nome completo *</Text>

          <TextInput
            style={styles.input}
            placeholder="Digite seu nome"
            value={nome}
            onChangeText={setNome}
            maxLength={100}
          />

          <Text style={styles.label}>Telefone *</Text>

          <TextInput
            style={styles.input}
            placeholder="(83) 99999-9999"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            maxLength={20}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Recebimento</Text>

          <TouchableOpacity
            style={[
              styles.option,
              tipoEntrega === 'entrega' && styles.optionSelected,
            ]}
            onPress={() => setTipoEntrega('entrega')}
          >
            <Text style={styles.optionText}>
              🛵 Entrega no endereço
            </Text>

            <Text style={styles.mark}>
              {tipoEntrega === 'entrega' ? '✓' : '○'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              tipoEntrega === 'retirada' && styles.optionSelected,
            ]}
            onPress={() => setTipoEntrega('retirada')}
          >
            <Text style={styles.optionText}>
              🏪 Retirada no estabelecimento
            </Text>

            <Text style={styles.mark}>
              {tipoEntrega === 'retirada' ? '✓' : '○'}
            </Text>
          </TouchableOpacity>

          {tipoEntrega === 'entrega' && (
            <>
              <Text style={styles.label}>
                Endereço completo *
              </Text>

              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Rua, número, bairro e complemento"
                value={endereco}
                onChangeText={setEndereco}
                multiline
                maxLength={250}
              />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Pagamento</Text>

          {(['Pix', 'Dinheiro', 'Cartão'] as const).map(
            (opcao) => (
              <TouchableOpacity
                key={opcao}
                style={[
                  styles.option,
                  pagamento === opcao && styles.optionSelected,
                ]}
                onPress={() => setPagamento(opcao)}
              >
                <Text style={styles.optionText}>
                  {opcao === 'Pix'
                    ? '📱'
                    : opcao === 'Dinheiro'
                      ? '💵'
                      : '💳'}{' '}
                  {opcao}
                </Text>

                <Text style={styles.mark}>
                  {pagamento === opcao ? '✓' : '○'}
                </Text>
              </TouchableOpacity>
            ),
          )}

          {pagamento === 'Dinheiro' && (
            <>
              <Text style={styles.label}>
                Troco para (opcional)
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Ex.: 50,00"
                value={troco}
                onChangeText={setTroco}
                keyboardType="decimal-pad"
                maxLength={15}
              />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Resumo do pedido
          </Text>

          {itens.map((item) => (
            <View key={item.id} style={styles.summaryItem}>
              <Text style={styles.summaryName}>
                {item.quantidade}x {item.descricao()}
              </Text>

              <Text style={styles.summaryPrice}>
                {formatarCentavos(item.subtotal())}
              </Text>
            </View>
          ))}

          {taxaEntrega > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryName}>Taxa de entrega</Text>
              <Text style={styles.summaryPrice}>{formatarCentavos(taxaEntrega)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Total do pedido
            </Text>

            <Text style={styles.total}>
              {formatarCentavos(total)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, enviando && styles.buttonDisabled]}
          onPress={confirmarPedido}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Confirmar pedido
            </Text>
          )}
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
    padding: 20,
    paddingBottom: 36,
  },
  back: {
    fontSize: 16,
    color: '#8B1E1E',
    fontWeight: '600',
    marginBottom: 18,
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#8B1E1E',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0E3D5',
    marginBottom: 14,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B1E1E',
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444444',
    marginBottom: 7,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDCFC2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#FFFCF8',
    color: '#222222',
  },
  multiline: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5D8CC',
    borderRadius: 10,
    padding: 13,
    marginBottom: 9,
  },
  optionSelected: {
    borderColor: '#8B1E1E',
    backgroundColor: '#FFF1D6',
  },
  optionText: {
    fontSize: 15,
    color: '#333333',
  },
  mark: {
    fontSize: 18,
    color: '#8B1E1E',
    fontWeight: 'bold',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  summaryName: {
    flex: 1,
    fontSize: 14,
    color: '#444444',
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0E3D5',
    paddingTop: 14,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    color: '#555555',
  },
  total: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#8B1E1E',
  },
  primaryButton: {
    backgroundColor: '#8B1E1E',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#C9B8A6',
  },
});