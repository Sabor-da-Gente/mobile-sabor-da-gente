import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoFavorito } from '@/components/botao-favorito';
import { Carregando, ErroTela } from '@/components/estado-tela';
import { Paleta } from '@/constants/paleta';
import { useAuth } from '@/context/AuthContext';
import { useFavoritos } from '@/context/FavoritosContext';
import { useConsultaAoFocar } from '@/hooks/use-consulta';
import { usePerfilRepository } from '@/hooks/use-repositorios';
import type { Endereco, Perfil } from '@/models/Perfil';
import { avisar } from '@/utils/alerta';
import { formatarCentavos } from '@/utils/dinheiro';
import { emailValido, formatarTelefone, telefoneValido } from '@/utils/validacao';

export default function PerfilScreen() {
  const repo = usePerfilRepository();
  const carregar = useCallback(async () => {
    const [perfil, enderecos] = await Promise.all([repo.buscarPerfil(), repo.listarEnderecos()]);
    return { perfil, enderecos };
  }, [repo]);
  const { dados, carregando, erro, recarregar } = useConsultaAoFocar(carregar);

  if (carregando && !dados) {
    return (
      <SafeAreaView style={styles.container}>
        <Carregando />
      </SafeAreaView>
    );
  }

  if (erro || !dados) {
    return (
      <SafeAreaView style={styles.container}>
        <ErroTela erro={erro} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Meu perfil 👤</Text>
        <Text style={styles.subtitulo}>Seus dados ficam salvos na sua conta.</Text>

        <ContaCard />

        {/* key: refaz o formulário quando o perfil salvo muda. */}
        <FormularioPerfil
          key={JSON.stringify(dados.perfil)}
          perfil={dados.perfil}
          onSalvo={recarregar}
        />

        <ResumoEnderecos enderecos={dados.enderecos} />

        <ListaFavoritos />

        <TouchableOpacity style={styles.atalho} onPress={() => router.push('/pedidos')}>
          <Text style={styles.atalhoTexto}>📦 Meus pedidos</Text>
          <Text style={styles.atalhoSeta}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function FormularioPerfil({ perfil, onSalvo }: { perfil: Perfil | null; onSalvo: () => void }) {
  const repo = usePerfilRepository();
  const [nome, setNome] = useState(perfil?.nome ?? '');
  const [telefone, setTelefone] = useState(perfil?.telefone ?? '');
  const [email, setEmail] = useState(perfil?.email ?? '');
  const [salvando, setSalvando] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  async function salvar() {
    if (!nome.trim()) {
      avisar('Nome obrigatório', 'Informe seu nome.');
      return;
    }
    if (!telefoneValido(telefone)) {
      avisar('Telefone inválido', 'Informe o telefone com DDD, por exemplo (83) 99999-9999.');
      return;
    }
    if (email.trim() && !emailValido(email)) {
      avisar('E-mail inválido', 'Confira o e-mail ou deixe em branco.');
      return;
    }

    setSalvando(true);
    try {
      await repo.salvarPerfil({
        nome: nome.trim(),
        telefone: formatarTelefone(telefone),
        email: email.trim() || null,
      });
      avisar('Perfil salvo', 'Seus dados serão usados nos próximos pedidos.');
      onSalvo();
    } catch (e) {
      console.error('Erro ao salvar perfil:', e);
      avisar('Erro', 'Não foi possível salvar o perfil. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.cartao}>
      <Text style={styles.secao}>Seus dados</Text>

      <Text style={styles.rotulo}>Nome *</Text>
      <TextInput
        style={styles.campo}
        value={nome}
        onChangeText={setNome}
        placeholder="Digite seu nome"
        placeholderTextColor={Paleta.textoSuave}
      />

      <Text style={styles.rotulo}>Telefone *</Text>
      <TextInput
        style={styles.campo}
        value={telefone}
        onChangeText={setTelefone}
        placeholder="(83) 99999-9999"
        placeholderTextColor={Paleta.textoSuave}
        keyboardType="phone-pad"
      />

      <Text style={styles.rotulo}>E-mail (opcional)</Text>
      <TextInput
        style={styles.campo}
        value={email}
        onChangeText={setEmail}
        placeholder="voce@email.com"
        placeholderTextColor={Paleta.textoSuave}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        style={[styles.botaoPrimario, salvando && styles.botaoDesabilitado]}
        onPress={salvar}
        disabled={salvando}
      >
        <Text style={styles.botaoPrimarioTexto}>{perfil ? 'Salvar alterações' : 'Salvar perfil'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ResumoEnderecos({ enderecos }: { enderecos: Endereco[] }) {
  const { user } = useAuth();
  if (!user) return null;

  const principal = enderecos.find((e) => e.principal);

  return (
    <View style={styles.cartao}>
      <Text style={styles.secao}>Endereços</Text>

      {principal ? (
        <>
          <Text style={styles.enderecoTitulo}>⭐ {principal.titulo}</Text>
          <Text style={styles.enderecoTexto}>{principal.resumo()}</Text>
          {enderecos.length > 1 && (
            <Text style={styles.enderecoTexto}>
              + {enderecos.length - 1} {enderecos.length === 2 ? 'outro endereço' : 'outros endereços'}
            </Text>
          )}
        </>
      ) : (
        <Text style={styles.enderecoTexto}>Nenhum endereço salvo ainda.</Text>
      )}

      <TouchableOpacity style={styles.botaoSecundario} onPress={() => router.push('/enderecos')}>
        <Text style={styles.botaoSecundarioTexto}>
          {enderecos.length > 0 ? 'Gerenciar endereços' : 'Cadastrar endereço'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ListaFavoritos() {
  const { favoritos, carregando } = useFavoritos();

  return (
    <View style={styles.cartao}>
      <Text style={styles.secao}>Favoritos ♥</Text>

      {carregando && <Text style={styles.enderecoTexto}>Carregando...</Text>}

      {!carregando && favoritos.length === 0 && (
        <Text style={styles.enderecoTexto}>
          Toque no ♡ de um produto ou sabor de pizza para guardá-lo aqui.
        </Text>
      )}

      {favoritos.map((f) => (
        <View key={`${f.tipo}-${f.id}`} style={styles.favorito}>
          <TouchableOpacity
            style={styles.favoritoInfo}
            onPress={() =>
              f.tipo === 'produto'
                ? router.push({ pathname: '/categoria/[id]', params: { id: f.categoriaSlug } })
                : router.push({ pathname: '/monte-sua-pizza', params: { sabor: String(f.id) } })
            }
          >
            <Text style={styles.enderecoTitulo}>
              {f.tipo === 'produto' ? f.icone : '🍕'} {f.nome}
            </Text>
            <Text style={styles.enderecoTexto}>
              {f.tipo === 'produto'
                ? formatarCentavos(f.preco)
                : f.aPartirDe !== null
                  ? `Pizza · a partir de ${formatarCentavos(f.aPartirDe)}`
                  : 'Pizza'}
            </Text>
          </TouchableOpacity>

          <BotaoFavorito alvo={{ tipo: f.tipo, id: f.id }} nome={f.nome} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fundo },
  content: { padding: 20, paddingBottom: 110 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Paleta.primaria, marginBottom: 6 },
  subtitulo: { fontSize: 15, color: Paleta.textoSecundario, marginBottom: 20 },
  cartao: {
    padding: 18,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  secao: { fontSize: 18, fontWeight: 'bold', color: Paleta.texto, marginBottom: 12 },
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
  enderecoTitulo: { fontSize: 16, fontWeight: 'bold', color: Paleta.texto, marginBottom: 4 },
  enderecoTexto: { fontSize: 14, color: Paleta.textoSuave, marginBottom: 4 },
  favorito: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Paleta.borda,
  },
  favoritoInfo: { flex: 1 },
  botaoPrimario: {
    marginTop: 4,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Paleta.primaria,
  },
  botaoDesabilitado: { backgroundColor: Paleta.desabilitado },
  botaoPrimarioTexto: { color: Paleta.textoSobrePrimaria, fontSize: 16, fontWeight: 'bold' },
  botaoSecundario: {
    marginTop: 12,
    padding: 13,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Paleta.primaria,
  },
  botaoSecundarioTexto: { color: Paleta.primaria, fontSize: 15, fontWeight: 'bold' },
  atalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  atalhoTexto: { fontSize: 16, fontWeight: 'bold', color: Paleta.texto },
  atalhoSeta: { fontSize: 22, color: Paleta.textoSuave },
});

function ContaCard() {
  const { user, sair } = useAuth();

  return (
    <View style={styles.cartao}>
      <Text style={styles.secao}>Conta</Text>
      {user ? (
        <>
          <Text style={styles.enderecoTexto}>Você está logado como {user.email}.</Text>
          <TouchableOpacity
            style={styles.botaoSecundario}
            onPress={() => sair().catch(() => avisar('Erro', 'Não foi possível sair. Tente novamente.'))}
          >
            <Text style={styles.botaoSecundarioTexto}>Sair da conta</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.enderecoTexto}>Entre ou cadastre-se para fazer e acompanhar pedidos.</Text>
          <TouchableOpacity style={styles.botaoPrimario} onPress={() => router.push('/login')}>
            <Text style={styles.botaoPrimarioTexto}>Entrar ou cadastrar</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
