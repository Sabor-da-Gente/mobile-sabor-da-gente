import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Paleta } from '@/constants/paleta';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';

type Modo = 'entrar' | 'cadastrar';

function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered')) return 'Este e-mail já está cadastrado.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
  if (m.includes('email address') && m.includes('invalid')) return 'E-mail inválido. Use um e-mail real, por exemplo do Gmail.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'O cadastro está desativado no servidor.';
  if (m.includes('database error')) return 'Erro ao criar o perfil no servidor. Avise a equipe.';
  if (m.includes('password')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (m.includes('network')) return 'Sem conexão. Tente de novo.';
  return mensagem;
}

export default function LoginScreen() {
  const router = useRouter();
  const { user, sair } = useAuth();

  const [modo, setModo] = useState<Modo>('entrar');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function enviar() {
    setErro('');
    setAviso('');

    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }

    if (modo === 'cadastrar') {
      if (nome.trim().length < 2) {
        setErro('Informe seu nome.');
        return;
      }
      if (telefone.replace(/\D/g, '').length < 10) {
        setErro('Informe um telefone com DDD.');
        return;
      }
      if (senha.length < 6) {
        setErro('A senha deve ter pelo menos 6 caracteres.');
        return;
      }
    }

    setEnviando(true);
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: emailLimpo, password: senha });
        if (error) throw error;
        voltar();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: emailLimpo,
          password: senha,
          options: { data: { nome: nome.trim(), telefone: telefone.trim() } },
        });
        if (error) throw error;
        if (data.session) voltar();
        else setAviso('Cadastro feito! Confirme seu e-mail e depois entre.');
      }
    } catch (e) {
      setErro(traduzirErro(e instanceof Error ? e.message : 'Não foi possível continuar.'));
    } finally {
      setEnviando(false);
    }
  }

  if (user) {
    return (
      <SafeAreaView style={estilos.container}>
        <View style={estilos.centro}>
          <Text style={estilos.titulo}>Você já está logado 👋</Text>
          <Text style={[estilos.subtitulo, estilos.textoCentro]}>{user.email}</Text>
          {erro !== '' && <Text style={estilos.erro}>{erro}</Text>}

          <Pressable style={[estilos.botaoPrimario, estilos.botaoLargo]} onPress={voltar}>
            <Text style={estilos.botaoPrimarioTexto}>Voltar</Text>
          </Pressable>
          <Pressable
            style={[estilos.botaoSecundario, estilos.botaoLargo]}
            onPress={() => sair().catch(() => setErro('Não foi possível sair.'))}
          >
            <Text style={estilos.botaoSecundarioTexto}>Sair da conta</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const cadastrando = modo === 'cadastrar';

  function trocarModo(novo: Modo) {
    setModo(novo);
    setErro('');
    setAviso('');
  }

  return (
    <SafeAreaView style={estilos.container}>
      <KeyboardAvoidingView
        style={estilos.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <Pressable onPress={voltar}>
            <Text style={estilos.voltar}>‹ Voltar</Text>
          </Pressable>

          <Text style={estilos.titulo}>{cadastrando ? 'Criar conta 🍕' : 'Entrar 🍕'}</Text>
          <Text style={estilos.subtitulo}>
            {cadastrando
              ? 'Cadastre-se para pedir. Usamos nome e telefone para a entrega.'
              : 'Entre para fazer e acompanhar seus pedidos.'}
          </Text>

          <View style={estilos.abas}>
            {(['entrar', 'cadastrar'] as const).map((m) => (
              <Pressable
                key={m}
                style={[estilos.aba, modo === m && estilos.abaAtiva]}
                onPress={() => trocarModo(m)}
              >
                <Text style={[estilos.abaTexto, modo === m && estilos.abaTextoAtiva]}>
                  {m === 'entrar' ? 'Entrar' : 'Criar conta'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={estilos.cartao}>
            {cadastrando && (
              <>
                <Text style={estilos.rotulo}>Nome *</Text>
                <TextInput
                  style={estilos.campo}
                  placeholder="Digite seu nome"
                  placeholderTextColor={Paleta.textoSuave}
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                />

                <Text style={estilos.rotulo}>Telefone *</Text>
                <TextInput
                  style={estilos.campo}
                  placeholder="(83) 99999-9999"
                  placeholderTextColor={Paleta.textoSuave}
                  value={telefone}
                  onChangeText={setTelefone}
                  keyboardType="phone-pad"
                />
              </>
            )}

            <Text style={estilos.rotulo}>E-mail *</Text>
            <TextInput
              style={estilos.campo}
              placeholder="voce@email.com"
              placeholderTextColor={Paleta.textoSuave}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={estilos.rotulo}>Senha *</Text>
            <TextInput
              style={estilos.campo}
              placeholder={cadastrando ? 'Pelo menos 6 caracteres' : 'Sua senha'}
              placeholderTextColor={Paleta.textoSuave}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              autoCapitalize="none"
            />

            {erro !== '' && <Text style={estilos.erro}>{erro}</Text>}
            {aviso !== '' && <Text style={estilos.aviso}>{aviso}</Text>}

            <Pressable
              style={[estilos.botaoPrimario, enviando && estilos.botaoDesabilitado]}
              onPress={enviar}
              disabled={enviando}
            >
              {enviando ? (
                <ActivityIndicator color={Paleta.textoSobrePrimaria} />
              ) : (
                <Text style={estilos.botaoPrimarioTexto}>{cadastrando ? 'Cadastrar' : 'Entrar'}</Text>
              )}
            </Pressable>
          </View>

          <Pressable style={estilos.link} onPress={() => trocarModo(cadastrando ? 'entrar' : 'cadastrar')}>
            <Text style={estilos.linkTexto}>
              {cadastrando ? 'Já tenho conta. Entrar' : 'Não tenho conta. Cadastrar'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fundo },
  conteudo: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  voltar: { fontSize: 16, color: Paleta.primaria, fontWeight: '600', marginBottom: 18 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: Paleta.primaria, marginBottom: 6 },
  subtitulo: { fontSize: 15, color: Paleta.textoSecundario, marginBottom: 20 },
  textoCentro: { textAlign: 'center' },
  abas: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  aba: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Paleta.primaria,
  },
  abaAtiva: { backgroundColor: Paleta.primaria },
  abaTexto: { fontSize: 15, fontWeight: 'bold', color: Paleta.primaria },
  abaTextoAtiva: { color: Paleta.textoSobrePrimaria },
  cartao: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
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
  erro: { fontSize: 14, color: Paleta.erro, marginBottom: 12 },
  aviso: { fontSize: 14, color: Paleta.sucesso, marginBottom: 12 },
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
  botaoLargo: { alignSelf: 'stretch' },
  link: { alignItems: 'center', marginTop: 18, padding: 6 },
  linkTexto: { fontSize: 15, fontWeight: '600', color: Paleta.primaria },
});
