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
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';

type Modo = 'entrar' | 'cadastrar';

function traduzirErro(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered')) return 'Este e-mail já está cadastrado.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('password')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (m.includes('network')) return 'Sem conexão. Tente de novo.';
  return mensagem;
}

export default function LoginScreen() {
  const router = useRouter();
  const { user, sair } = useAuth();
  const escuro = useColorScheme() === 'dark';

  const cor = {
    fundo: escuro ? '#121212' : '#FFFFFF',
    texto: escuro ? '#F2F2F2' : '#1A1A1A',
    suave: escuro ? '#A0A0A0' : '#666666',
    borda: escuro ? '#3A3A3A' : '#D0D0D0',
    destaque: '#C0392B',
  };

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
        // O trigger do banco cria o perfil com nome e telefone de options.data.
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
      <View style={[estilos.centro, { backgroundColor: cor.fundo }]}>
        <Text style={[estilos.titulo, { color: cor.texto }]}>Você já está logado</Text>
        <Text style={{ color: cor.suave, marginBottom: 24 }}>{user.email}</Text>
        <Pressable style={[estilos.botao, { backgroundColor: cor.destaque }]} onPress={voltar}>
          <Text style={estilos.botaoTexto}>Voltar</Text>
        </Pressable>
        <Pressable style={estilos.link} onPress={() => sair().catch(() => setErro('Não foi possível sair.'))}>
          <Text style={{ color: cor.suave }}>Sair da conta</Text>
        </Pressable>
      </View>
    );
  }

  const campo = [estilos.campo, { color: cor.texto, borderColor: cor.borda }];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cor.fundo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Pressable style={estilos.voltar} onPress={voltar}>
          <Text style={{ color: cor.suave }}>‹ Voltar</Text>
        </Pressable>

        <Text style={[estilos.titulo, { color: cor.texto }]}>
          {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </Text>
        <Text style={{ color: cor.suave, marginBottom: 20 }}>
          {modo === 'entrar'
            ? 'Entre para fazer e acompanhar seus pedidos.'
            : 'Cadastre-se para pedir. Usamos nome e telefone para a entrega.'}
        </Text>

        {modo === 'cadastrar' && (
          <>
            <TextInput
              style={campo}
              placeholder="Nome"
              placeholderTextColor={cor.suave}
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
            />
            <TextInput
              style={campo}
              placeholder="Telefone com DDD"
              placeholderTextColor={cor.suave}
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
            />
          </>
        )}

        <TextInput
          style={campo}
          placeholder="E-mail"
          placeholderTextColor={cor.suave}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={campo}
          placeholder="Senha"
          placeholderTextColor={cor.suave}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          autoCapitalize="none"
        />

        {erro !== '' && <Text style={estilos.erro}>{erro}</Text>}
        {aviso !== '' && <Text style={estilos.aviso}>{aviso}</Text>}

        <Pressable
          style={[estilos.botao, { backgroundColor: cor.destaque, opacity: enviando ? 0.6 : 1 }]}
          onPress={enviar}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={estilos.botaoTexto}>{modo === 'entrar' ? 'Entrar' : 'Cadastrar'}</Text>
          )}
        </Pressable>

        <Pressable
          style={estilos.link}
          onPress={() => {
            setModo(modo === 'entrar' ? 'cadastrar' : 'entrar');
            setErro('');
            setAviso('');
          }}
        >
          <Text style={{ color: cor.destaque }}>
            {modo === 'entrar' ? 'Não tenho conta. Cadastrar' : 'Já tenho conta. Entrar'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  campo: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, fontSize: 16 },
  botao: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8, minWidth: 160 },
  botaoTexto: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  link: { alignItems: 'center', marginTop: 18, padding: 6 },
  voltar: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 12 },
  erro: { color: '#C0392B', marginBottom: 8 },
  aviso: { color: '#1E8449', marginBottom: 8 },
});
