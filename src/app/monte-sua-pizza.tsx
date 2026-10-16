import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraAdicionado } from '@/components/barra-adicionado';
import { Carregando, ErroTela } from '@/components/estado-tela';
import { Paleta } from '@/constants/paleta';
import { useCarrinho } from '@/context/CarrinhoContext';
import { useConsulta } from '@/hooks/use-consulta';
import { useCardapioRepository } from '@/hooks/use-repositorios';
import type { OpcoesPizza } from '@/models/Pizza';
import { precoPizza, problemaNosSabores } from '@/services/PrecoService';
import { avisar } from '@/utils/alerta';
import { formatarCentavos } from '@/utils/dinheiro';

export default function MonteSuaPizzaScreen() {
  const repo = useCardapioRepository();
  const carregar = useCallback(() => repo.buscarOpcoesPizza(), [repo]);
  const { dados, carregando, erro } = useConsulta(carregar);

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <Carregando texto="Carregando opções..." />
      </SafeAreaView>
    );
  }

  if (erro || !dados || dados.tamanhos.length === 0 || dados.massas.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ErroTela erro={erro} titulo={erro ? undefined : 'Nenhuma pizza disponível no momento'} />
      </SafeAreaView>
    );
  }

  return <Montagem opcoes={dados} />;
}

function Montagem({ opcoes }: { opcoes: OpcoesPizza }) {
  const { adicionar, quantidadeTotal } = useCarrinho();

  const [tamanhoId, setTamanhoId] = useState(opcoes.tamanhos.at(-1)!.id);
  const [massaId, setMassaId] = useState(opcoes.massas[0].id);
  const [saborIds, setSaborIds] = useState<number[]>([]);
  const [adicionalIds, setAdicionalIds] = useState<number[]>([]);
  const [observacao, setObservacao] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const fecharBanner = useCallback(() => setBanner(null), []);

  const tamanho = opcoes.tamanhos.find((t) => t.id === tamanhoId)!;
  const massa = opcoes.massas.find((m) => m.id === massaId)!;
  const sabores = saborIds.flatMap((id) => opcoes.sabores.find((s) => s.id === id) ?? []);
  const adicionais = opcoes.adicionais.filter((a) => adicionalIds.includes(a.id));
  const saboresDoTamanho = opcoes.sabores.filter((s) => s.disponivelNo(tamanho.id));

  const preco = precoPizza(tamanho, massa, sabores, adicionais);
  const problema = problemaNosSabores(tamanho, sabores);

  function escolherTamanho(id: number) {
    const novo = opcoes.tamanhos.find((t) => t.id === id)!;
    setTamanhoId(id);
    // Mantém só os sabores que existem no novo tamanho, até o limite dele.
    setSaborIds((atuais) =>
      atuais
        .filter((saborId) => opcoes.sabores.find((s) => s.id === saborId)?.disponivelNo(id))
        .slice(0, novo.maxSabores),
    );
  }

  function alternarSabor(id: number) {
    if (saborIds.includes(id)) {
      setSaborIds(saborIds.filter((s) => s !== id));
      return;
    }
    if (saborIds.length >= tamanho.maxSabores) {
      avisar('Limite de sabores', `A pizza ${tamanho.nome} aceita até ${tamanho.maxSabores} sabores.`);
      return;
    }
    setSaborIds([...saborIds, id]);
  }

  function alternarAdicional(id: number) {
    setAdicionalIds((atuais) =>
      atuais.includes(id) ? atuais.filter((a) => a !== id) : [...atuais, id],
    );
  }

  async function adicionarPizza() {
    if (problema) {
      avisar('Pizza incompleta', problema);
      return;
    }

    await adicionar({
      tipo: 'pizza',
      tamanhoId,
      massaId,
      saborIds,
      adicionalIds,
      observacao,
    });

    setBanner(`Pizza ${tamanho.nome} (${sabores.map((s) => s.nome).join(' e ')}) adicionada ao carrinho`);
    setSaborIds([]);
    setAdicionalIds([]);
    setObservacao('');
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
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.botaoVoltar} onPress={voltar}>
            <Text style={styles.botaoVoltarTexto}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.linhaTitulo}>
            <Text style={styles.titulo}>Monte sua pizza 🍕</Text>

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

        <Text style={styles.secao}>1. Tamanho</Text>
        <View style={styles.chips}>
          {opcoes.tamanhos.map((t) => (
            <Chip
              key={t.id}
              ativo={t.id === tamanhoId}
              titulo={t.nome}
              detalhe={`${t.fatias} fatias · até ${t.maxSabores} ${t.maxSabores === 1 ? 'sabor' : 'sabores'}`}
              onPress={() => escolherTamanho(t.id)}
            />
          ))}
        </View>

        <Text style={styles.secao}>2. Massa</Text>
        <View style={styles.chips}>
          {opcoes.massas.map((m) => (
            <Chip
              key={m.id}
              ativo={m.id === massaId}
              titulo={m.nome}
              detalhe={m.acrescimo > 0 ? `+ ${formatarCentavos(m.acrescimo)}` : 'sem acréscimo'}
              onPress={() => setMassaId(m.id)}
            />
          ))}
        </View>

        <Text style={styles.secao}>
          3. Sabores ({saborIds.length} de {tamanho.maxSabores})
        </Text>
        <Text style={styles.ajuda}>Com mais de um sabor, vale o preço do sabor mais caro.</Text>
        {saboresDoTamanho.map((sabor) => (
          <Opcao
            key={sabor.id}
            selecionado={saborIds.includes(sabor.id)}
            titulo={sabor.nome}
            descricao={sabor.descricao}
            preco={formatarCentavos(sabor.precoNoTamanho(tamanho.id) ?? 0)}
            onPress={() => alternarSabor(sabor.id)}
          />
        ))}

        {opcoes.adicionais.length > 0 && (
          <>
            <Text style={styles.secao}>4. Adicionais</Text>
            {opcoes.adicionais.map((adicional) => (
              <Opcao
                key={adicional.id}
                selecionado={adicionalIds.includes(adicional.id)}
                titulo={adicional.nome}
                preco={`+ ${formatarCentavos(adicional.preco)}`}
                onPress={() => alternarAdicional(adicional.id)}
              />
            ))}
          </>
        )}

        <Text style={styles.secao}>5. Observação</Text>
        <TextInput
          style={styles.observacao}
          placeholder="Ex.: sem cebola, bem assada..."
          placeholderTextColor={Paleta.textoSuave}
          value={observacao}
          onChangeText={setObservacao}
          maxLength={140}
          multiline
        />

        <TouchableOpacity
          style={[styles.botaoAdicionar, problema !== null && styles.botaoDesabilitado]}
          onPress={adicionarPizza}
        >
          <Text style={styles.botaoAdicionarTexto}>
            Adicionar ao carrinho · {formatarCentavos(preco)}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {banner && <BarraAdicionado mensagem={banner} onFechar={fecharBanner} />}
    </SafeAreaView>
  );
}

function Chip(props: { ativo: boolean; titulo: string; detalhe: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, props.ativo && styles.chipAtivo]}
      onPress={props.onPress}
      accessibilityState={{ selected: props.ativo }}
    >
      <Text style={[styles.chipTitulo, props.ativo && styles.chipTextoAtivo]}>{props.titulo}</Text>
      <Text style={[styles.chipDetalhe, props.ativo && styles.chipTextoAtivo]}>{props.detalhe}</Text>
    </TouchableOpacity>
  );
}

function Opcao(props: {
  selecionado: boolean;
  titulo: string;
  descricao?: string;
  preco: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.opcao, props.selecionado && styles.opcaoSelecionada]}
      onPress={props.onPress}
      accessibilityState={{ checked: props.selecionado }}
    >
      <View style={styles.opcaoInfo}>
        <Text style={styles.opcaoTitulo}>{props.titulo}</Text>
        {props.descricao ? <Text style={styles.opcaoDescricao}>{props.descricao}</Text> : null}
        <Text style={styles.opcaoPreco}>{props.preco}</Text>
      </View>

      <View style={[styles.checkbox, props.selecionado && styles.checkboxSelecionado]}>
        {props.selecionado && <Text style={styles.check}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fundo },
  content: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
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
  titulo: { flex: 1, fontSize: 28, fontWeight: 'bold', color: Paleta.primaria },
  botaoCarrinho: {
    backgroundColor: Paleta.primaria,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
  },
  botaoCarrinhoTexto: { color: Paleta.textoSobrePrimaria, fontSize: 15, fontWeight: 'bold' },

  secao: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
    fontSize: 19,
    fontWeight: 'bold',
    color: Paleta.texto,
  },
  ajuda: { marginHorizontal: 20, marginTop: -4, marginBottom: 10, fontSize: 13, color: Paleta.textoSuave },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  chip: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Paleta.borda,
    backgroundColor: Paleta.superficie,
  },
  chipAtivo: { backgroundColor: Paleta.primaria, borderColor: Paleta.primaria },
  chipTitulo: { fontSize: 16, fontWeight: 'bold', color: Paleta.texto, marginBottom: 3 },
  chipDetalhe: { fontSize: 12, color: Paleta.textoSuave },
  chipTextoAtivo: { color: Paleta.textoSobrePrimaria },

  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  opcaoSelecionada: { borderColor: Paleta.primaria, borderWidth: 2, backgroundColor: '#FFF3E6' },
  opcaoInfo: { flex: 1 },
  opcaoTitulo: { fontSize: 16, fontWeight: 'bold', color: Paleta.texto, marginBottom: 3 },
  opcaoDescricao: { fontSize: 13, color: Paleta.textoSuave, marginBottom: 5 },
  opcaoPreco: { fontSize: 14, fontWeight: 'bold', color: Paleta.primaria },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Paleta.desabilitado,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkboxSelecionado: { backgroundColor: Paleta.primaria, borderColor: Paleta.primaria },
  check: { color: Paleta.textoSobrePrimaria, fontSize: 15, fontWeight: 'bold' },

  observacao: {
    marginHorizontal: 20,
    minHeight: 70,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Paleta.borda,
    backgroundColor: Paleta.superficie,
    fontSize: 15,
    color: Paleta.texto,
    textAlignVertical: 'top',
  },

  botaoAdicionar: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 17,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Paleta.primaria,
  },
  botaoDesabilitado: { backgroundColor: Paleta.desabilitado },
  botaoAdicionarTexto: { color: Paleta.textoSobrePrimaria, fontSize: 16, fontWeight: 'bold' },
});
