import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import { BarraAdicionado } from '@/components/barra-adicionado';
import { Paleta } from '@/constants/paleta';
import { useCarrinho } from '@/context/CarrinhoContext';
import { useProdutos } from '@/hooks/use-produtos';
import type { Produto } from '@/types';
import { formatarCentavos } from '@/utils/dinheiro';

type Ordem = 'padrao' | 'preco';

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function TelaCategoria({ categoriaId }: { categoriaId: string | undefined }) {
  const { categoria, produtos, carregando, erro, recarregar } = useProdutos(categoriaId);
  const { adicionar, quantidadeTotal } = useCarrinho();

  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<Ordem>('padrao');
  const [banner, setBanner] = useState<string | null>(null);
  const fecharBanner = useCallback(() => setBanner(null), []);

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());

    const filtrados = produtos.filter(
      (produto) =>
        produto.disponivel &&
        (termo === '' ||
          normalizar(produto.nome).includes(termo) ||
          normalizar(produto.descricao).includes(termo)),
    );

    return ordem === 'preco'
      ? [...filtrados].sort((a, b) => a.precoCentavos - b.precoCentavos)
      : filtrados;
  }, [produtos, busca, ordem]);

  if (carregando && !categoria) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={Paleta.primaria} />
        </View>
      </SafeAreaView>
    );
  }

  if (!categoria) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centro}>
          <Text style={styles.mensagemTitulo}>{erro ?? 'Categoria não encontrada'}</Text>
          <TouchableOpacity
            style={styles.botaoPrimario}
            onPress={erro ? recarregar : () => router.replace('/cardapio')}
          >
            <Text style={styles.botaoPrimarioTexto}>
              {erro ? 'Tentar novamente' : 'Voltar ao cardápio'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (categoria.ehPizza) {
    return <Redirect href="/monte-sua-pizza" />;
  }

  async function adicionarProduto(produto: Produto) {
    await adicionar({ tipo: 'produto', produtoId: produto.id });
    setBanner(`${produto.nome} adicionado ao carrinho`);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => router.replace('/cardapio')}
          >
            <Text style={styles.botaoVoltarTexto}>← Voltar ao cardápio</Text>
          </TouchableOpacity>

          <View style={styles.linhaTitulo}>
            <View style={styles.tituloContainer}>
              <Text style={styles.titulo}>
                {categoria.titulo} {categoria.emoji}
              </Text>
              <Text style={styles.subtitulo}>{categoria.subtitulo}</Text>
            </View>

            <TouchableOpacity
              style={styles.botaoCarrinho}
              onPress={() => router.push('/carrinho')}
              accessibilityLabel="Abrir carrinho"
            >
              <Text style={styles.botaoCarrinhoTexto}>
                🛒 {quantidadeTotal > 0 ? quantidadeTotal : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filtros}>
          <TextInput
            style={styles.busca}
            placeholder={`Buscar em ${categoria.titulo.toLowerCase()}...`}
            placeholderTextColor={Paleta.textoSuave}
            value={busca}
            onChangeText={setBusca}
            autoCorrect={false}
            returnKeyType="search"
          />

          <TouchableOpacity
            style={[styles.chip, ordem === 'preco' && styles.chipAtivo]}
            onPress={() => setOrdem((atual) => (atual === 'preco' ? 'padrao' : 'preco'))}
            accessibilityLabel="Ordenar por menor preço"
          >
            <Text style={[styles.chipTexto, ordem === 'preco' && styles.chipTextoAtivo]}>
              Menor preço
            </Text>
          </TouchableOpacity>
        </View>

        {carregando && <ActivityIndicator size="large" color={Paleta.primaria} style={styles.loading} />}

        {!carregando && erro && (
          <View style={styles.centro}>
            <Text style={styles.mensagemTexto}>{erro}</Text>
            <TouchableOpacity style={styles.botaoPrimario} onPress={recarregar}>
              <Text style={styles.botaoPrimarioTexto}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && visiveis.length === 0 && (
          <View style={styles.centro}>
            <Text style={styles.mensagemTitulo}>Nada encontrado</Text>
            <Text style={styles.mensagemTexto}>
              {busca.trim() ? `Nenhum item corresponde a "${busca.trim()}".` : 'Nenhum item disponível no momento.'}
            </Text>
          </View>
        )}

        {!carregando &&
          !erro &&
          visiveis.map((produto) => (
            <View key={produto.id} style={styles.cartao}>
              <View style={styles.cartaoIcone}>
                <Text style={styles.cartaoEmoji}>{produto.emoji}</Text>
              </View>

              <View style={styles.cartaoInfo}>
                <Text style={styles.cartaoNome}>{produto.nome}</Text>
                <Text style={styles.cartaoDescricao}>{produto.descricao}</Text>
                <Text style={styles.cartaoPreco}>{formatarCentavos(produto.precoCentavos)}</Text>

                <TouchableOpacity
                  style={styles.botaoAdicionar}
                  onPress={() => adicionarProduto(produto)}
                >
                  <Text style={styles.botaoAdicionarTexto}>+ Adicionar ao carrinho</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

        <TouchableOpacity
          style={styles.botaoSecundario}
          onPress={() => router.push('/carrinho')}
        >
          <Text style={styles.botaoSecundarioTexto}>Ver meu carrinho 🛒</Text>
        </TouchableOpacity>
      </ScrollView>

      {banner && <BarraAdicionado mensagem={banner} onFechar={fecharBanner} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fundo },
  content: { paddingBottom: 30 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  botaoVoltar: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    backgroundColor: Paleta.destaque,
  },
  botaoVoltarTexto: { color: Paleta.primaria, fontSize: 15, fontWeight: 'bold' },
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tituloContainer: { flex: 1 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Paleta.primaria, marginBottom: 6 },
  subtitulo: { fontSize: 16, color: Paleta.textoSecundario },
  botaoCarrinho: {
    backgroundColor: Paleta.primaria,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
  },
  botaoCarrinhoTexto: { color: Paleta.textoSobrePrimaria, fontSize: 15, fontWeight: 'bold' },

  filtros: { paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  busca: {
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: Paleta.texto,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Paleta.borda,
    backgroundColor: Paleta.superficie,
  },
  chipAtivo: { backgroundColor: Paleta.primaria, borderColor: Paleta.primaria },
  chipTexto: { fontSize: 13, fontWeight: '600', color: Paleta.texto },
  chipTextoAtivo: { color: Paleta.textoSobrePrimaria },


  loading: { marginVertical: 30 },
  centro: { alignItems: 'center', padding: 24 },
  mensagemTitulo: { fontSize: 18, fontWeight: 'bold', color: Paleta.texto, marginBottom: 8, textAlign: 'center' },
  mensagemTexto: { fontSize: 14, color: Paleta.textoSuave, textAlign: 'center', marginBottom: 16 },

  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  cartaoIcone: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: Paleta.destaqueSuave,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cartaoEmoji: { fontSize: 32 },
  cartaoInfo: { flex: 1 },
  cartaoNome: { fontSize: 17, fontWeight: 'bold', color: Paleta.texto, marginBottom: 3 },
  cartaoDescricao: { fontSize: 13, color: Paleta.textoSuave, marginBottom: 6 },
  cartaoPreco: { fontSize: 15, fontWeight: 'bold', color: Paleta.primaria },
  botaoAdicionar: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Paleta.destaque,
  },
  botaoAdicionarTexto: { fontSize: 14, fontWeight: 'bold', color: Paleta.primaria },


  botaoPrimario: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: Paleta.primaria,
  },
  botaoPrimarioTexto: { color: Paleta.textoSobrePrimaria, fontSize: 16, fontWeight: 'bold' },
  botaoSecundario: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Paleta.primaria,
  },
  botaoSecundarioTexto: { color: Paleta.primaria, fontSize: 16, fontWeight: 'bold' },

});