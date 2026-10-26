import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Carregando, ErroTela } from '@/components/estado-tela';
import { Paleta } from '@/constants/paleta';
import { useAuth } from '@/context/AuthContext';
import { useConsultaAoFocar } from '@/hooks/use-consulta';
import { usePerfilRepository } from '@/hooks/use-repositorios';
import type { Endereco } from '@/models/Perfil';
import { avisar, confirmar } from '@/utils/alerta';
import { voltarOu } from '@/utils/rotas';

export default function EnderecosScreen() {
  const repo = usePerfilRepository();
  const carregar = useCallback(() => repo.listarEnderecos(), [repo]);
  const { dados: enderecos, carregando, erro, recarregar } = useConsultaAoFocar(carregar);
  const { user, carregando: carregandoAuth } = useAuth();

  async function executar(acao: () => Promise<void>) {
    try {
      await acao();
    } catch (e) {
      console.error('Erro nos endereços:', e);
      avisar('Erro', 'Não foi possível concluir. Tente novamente.');
    }
    recarregar();
  }

  async function remover(endereco: Endereco) {
    const confirmou = await confirmar('Remover endereço', `Remover "${endereco.titulo}"?`, 'Remover');
    if (confirmou) await executar(() => repo.removerEndereco(endereco.id));
  }

  if (!carregandoAuth && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => voltarOu('/perfil')}>
            <Text style={styles.voltar}>‹ Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.titulo}>Meus endereços 📍</Text>

          <View style={styles.vazio}>
            <Text style={styles.vazioTexto}>Entre na sua conta para cadastrar e ver seus endereços.</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.voltar}>Entrar ou cadastrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (carregando && !enderecos) {
    return (
      <SafeAreaView style={styles.container}>
        <Carregando />
      </SafeAreaView>
    );
  }

  if (erro || !enderecos) {
    return (
      <SafeAreaView style={styles.container}>
        <ErroTela erro={erro} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => voltarOu('/perfil')}>
          <Text style={styles.voltar}>‹ Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Meus endereços 📍</Text>
        <Text style={styles.subtitulo}>O endereço principal já vem escolhido no pedido.</Text>

        {enderecos.length === 0 && (
          <View style={styles.vazio}>
            <Text style={styles.vazioTexto}>Você ainda não salvou nenhum endereço.</Text>
          </View>
        )}

        {enderecos.map((endereco) => (
          <View key={endereco.id} style={[styles.cartao, endereco.principal && styles.cartaoPrincipal]}>
            <View style={styles.linhaTitulo}>
              <Text style={styles.cartaoTitulo}>{endereco.titulo}</Text>
              {endereco.principal && <Text style={styles.selo}>Principal</Text>}
            </View>
            <Text style={styles.cartaoTexto}>{endereco.resumo()}</Text>
            {endereco.dados.cep && <Text style={styles.cartaoTexto}>CEP {endereco.dados.cep}</Text>}

            <View style={styles.acoes}>
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: '/enderecos/[id]', params: { id: String(endereco.id) } })
                }
              >
                <Text style={styles.acao}>Editar</Text>
              </TouchableOpacity>
              {!endereco.principal && (
                <TouchableOpacity onPress={() => executar(() => repo.marcarPrincipal(endereco.id))}>
                  <Text style={styles.acao}>Tornar principal</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => remover(endereco)}>
                <Text style={[styles.acao, styles.acaoPerigo]}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.botaoPrimario}
          onPress={() => router.push({ pathname: '/enderecos/[id]', params: { id: 'novo' } })}
        >
          <Text style={styles.botaoPrimarioTexto}>+ Novo endereço</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fundo },
  content: { padding: 20, paddingBottom: 40 },
  voltar: { fontSize: 16, color: Paleta.primaria, fontWeight: '600', marginBottom: 18 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Paleta.primaria, marginBottom: 6 },
  subtitulo: { fontSize: 15, color: Paleta.textoSecundario, marginBottom: 20 },
  vazio: {
    padding: 24,
    marginBottom: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  vazioTexto: { fontSize: 15, color: Paleta.textoSuave, textAlign: 'center' },
  cartao: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  cartaoPrincipal: { borderColor: Paleta.primaria, borderWidth: 2 },
  linhaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cartaoTitulo: { flexShrink: 1, fontSize: 17, fontWeight: 'bold', color: Paleta.texto },
  selo: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: 'bold',
    color: Paleta.textoSobrePrimaria,
    backgroundColor: Paleta.primaria,
  },
  cartaoTexto: { fontSize: 14, color: Paleta.textoSuave, marginBottom: 2 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 12 },
  acao: { fontSize: 14, fontWeight: 'bold', color: Paleta.primaria },
  acaoPerigo: { color: '#B42318' },
  botaoPrimario: {
    marginTop: 8,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Paleta.primaria,
  },
  botaoPrimarioTexto: { color: Paleta.textoSobrePrimaria, fontSize: 16, fontWeight: 'bold' },
});
