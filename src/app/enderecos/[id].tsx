import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Carregando, ErroTela } from '@/components/estado-tela';
import { Paleta } from '@/constants/paleta';
import { useConsulta } from '@/hooks/use-consulta';
import { usePerfilRepository } from '@/hooks/use-repositorios';
import type { DadosEndereco } from '@/models/Perfil';
import { avisar } from '@/utils/alerta';
import { voltarOu } from '@/utils/rotas';
import { cepValido, formatarCep } from '@/utils/validacao';

/** Cria (`/enderecos/novo`) ou edita (`/enderecos/3`) um endereço. */
export default function EnderecoFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const novo = id === 'novo';
  const repo = usePerfilRepository();

  const carregar = useCallback(
    async () => (novo ? null : repo.buscarEndereco(Number(id))),
    [repo, id, novo],
  );
  const { dados: endereco, carregando, erro } = useConsulta(carregar);

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <Carregando />
      </SafeAreaView>
    );
  }

  if (erro || (!novo && !endereco)) {
    return (
      <SafeAreaView style={styles.container}>
        <ErroTela erro={erro} titulo={erro ? undefined : 'Endereço não encontrado'} />
      </SafeAreaView>
    );
  }

  return <Formulario id={novo ? undefined : Number(id)} inicial={endereco?.dados} />;
}

function Formulario({ id, inicial }: { id?: number; inicial?: DadosEndereco }) {
  const repo = usePerfilRepository();
  const [campos, setCampos] = useState({
    apelido: inicial?.apelido ?? '',
    logradouro: inicial?.logradouro ?? '',
    numero: inicial?.numero ?? '',
    complemento: inicial?.complemento ?? '',
    bairro: inicial?.bairro ?? '',
    cidade: inicial?.cidade ?? '',
    uf: inicial?.uf ?? 'PB',
    cep: inicial?.cep ?? '',
    referencia: inicial?.referencia ?? '',
  });
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo: keyof typeof campos) => (valor: string) =>
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));

  async function salvar() {
    const c = Object.fromEntries(
      Object.entries(campos).map(([k, v]) => [k, v.trim()]),
    ) as typeof campos;

    if (!c.logradouro || !c.numero || !c.bairro || !c.cidade) {
      avisar('Dados incompletos', 'Preencha rua, número, bairro e cidade.');
      return;
    }
    if (!/^[A-Za-z]{2}$/.test(c.uf)) {
      avisar('UF inválida', 'Use a sigla do estado com 2 letras, por exemplo PB.');
      return;
    }
    if (c.cep && !cepValido(c.cep)) {
      avisar('CEP inválido', 'O CEP tem 8 números, por exemplo 58000-000. Pode deixar em branco.');
      return;
    }

    const dados: DadosEndereco = {
      apelido: c.apelido || null,
      logradouro: c.logradouro,
      numero: c.numero,
      complemento: c.complemento || null,
      bairro: c.bairro,
      cidade: c.cidade,
      uf: c.uf.toUpperCase(),
      cep: c.cep ? formatarCep(c.cep) : null,
      referencia: c.referencia || null,
    };

    setSalvando(true);
    try {
      await repo.salvarEndereco(dados, id);
      voltarOu('/enderecos');
    } catch (e) {
      console.error('Erro ao salvar endereço:', e);
      avisar('Erro', 'Não foi possível salvar o endereço. Tente novamente.');
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => voltarOu('/enderecos')}>
          <Text style={styles.voltar}>‹ Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>{id ? 'Editar endereço' : 'Novo endereço'}</Text>

        <View style={styles.cartao}>
          <Campo rotulo="Apelido (opcional)" placeholder="Casa, Trabalho..." value={campos.apelido} onChangeText={alterar('apelido')} />
          <Campo rotulo="Rua *" placeholder="Rua das Flores" value={campos.logradouro} onChangeText={alterar('logradouro')} />
          <View style={styles.linha}>
            <Campo estilo={styles.estreito} rotulo="Número *" placeholder="123" value={campos.numero} onChangeText={alterar('numero')} />
            <Campo estilo={styles.largo} rotulo="Complemento" placeholder="Apto 101" value={campos.complemento} onChangeText={alterar('complemento')} />
          </View>
          <Campo rotulo="Bairro *" placeholder="Centro" value={campos.bairro} onChangeText={alterar('bairro')} />
          <View style={styles.linha}>
            <Campo estilo={styles.largo} rotulo="Cidade *" placeholder="João Pessoa" value={campos.cidade} onChangeText={alterar('cidade')} />
            <Campo estilo={styles.estreito} rotulo="UF *" placeholder="PB" value={campos.uf} onChangeText={alterar('uf')} autoCapitalize="characters" maxLength={2} />
          </View>
          <Campo rotulo="CEP (opcional)" placeholder="58000-000" value={campos.cep} onChangeText={alterar('cep')} keyboardType="number-pad" maxLength={9} />
          <Campo rotulo="Ponto de referência (opcional)" placeholder="Perto da praça" value={campos.referencia} onChangeText={alterar('referencia')} />
        </View>

        <TouchableOpacity
          style={[styles.botaoPrimario, salvando && styles.botaoDesabilitado]}
          onPress={salvar}
          disabled={salvando}
        >
          <Text style={styles.botaoPrimarioTexto}>Salvar endereço</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Campo({ rotulo, estilo, ...props }: TextInputProps & { rotulo: string; estilo?: object }) {
  return (
    <View style={estilo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput style={styles.campo} placeholderTextColor={Paleta.textoSuave} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fundo },
  content: { padding: 20, paddingBottom: 40 },
  voltar: { fontSize: 16, color: Paleta.primaria, fontWeight: '600', marginBottom: 18 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Paleta.primaria, marginBottom: 20 },
  cartao: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  linha: { flexDirection: 'row', gap: 12 },
  estreito: { width: 90 },
  largo: { flex: 1 },
  rotulo: { fontSize: 14, fontWeight: '600', color: Paleta.texto, marginBottom: 6 },
  campo: {
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Paleta.borda,
    backgroundColor: Paleta.fundo,
    fontSize: 15,
    color: Paleta.texto,
  },
  botaoPrimario: { padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: Paleta.primaria },
  botaoDesabilitado: { backgroundColor: Paleta.desabilitado },
  botaoPrimarioTexto: { color: Paleta.textoSobrePrimaria, fontSize: 16, fontWeight: 'bold' },
});
