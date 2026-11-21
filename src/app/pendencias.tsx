import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoOffline } from '@/components/aviso-offline';
import { Paleta } from '@/constants/paleta';
import { useSync } from '@/context/SyncContext';
import type { ItemFila } from '@/repositories/FilaRepository';
import { avisar, confirmar } from '@/utils/alerta';
import { formatarDataHora } from '@/utils/pedido';
import { voltarOu } from '@/utils/rotas';

const ROTULO_OPERACAO: Record<string, string> = {
  salvar_perfil: 'Dados do perfil',
  criar_endereco: 'Novo endereço',
  editar_endereco: 'Endereço editado',
  endereco_principal: 'Endereço principal',
  remover_endereco: 'Endereço removido',
  criar_pedido: 'Novo pedido',
  cancelar_pedido: 'Cancelamento de pedido',
  adicionar_favorito: 'Favorito adicionado',
  remover_favorito: 'Favorito removido',
};

const ROTULO_STATUS: Record<ItemFila['status'], string> = {
  pendente: 'Aguardando envio',
  enviando: 'Enviando...',
  erro: 'Não enviado',
};

export default function PendenciasScreen() {
  const { online, versao, listarFila, reenviar, descartar, sincronizarAgora } = useSync();
  const [itens, setItens] = useState<ItemFila[]>([]);

  useEffect(() => {
    let ativo = true;
    listarFila()
      .then((lista) => ativo && setItens(lista))
      .catch((e) => console.error('Erro ao listar a fila:', e));
    return () => {
      ativo = false;
    };
  }, [listarFila, versao]);

  async function enviarAgora() {
    const resultado = await sincronizarAgora();
    if (resultado === 'offline') avisar('Sem conexão', 'As alterações serão enviadas quando a internet voltar.');
    if (resultado === 'sem_usuario') avisar('Entre na sua conta', 'É preciso estar logado para enviar.');
  }

  async function remover(item: ItemFila) {
    const confirmou = await confirmar(
      'Descartar alteração',
      'Ela não será enviada ao servidor. Deseja descartar?',
      'Descartar',
    );
    if (confirmou) await descartar(item.id);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => voltarOu('/perfil')}>
          <Text style={styles.voltar}>‹ Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Alterações pendentes</Text>
        <Text style={styles.subtitulo}>
          O que você fez sem internet fica salvo no aparelho e é enviado nesta ordem.
        </Text>

        <AvisoOffline />

        {itens.length === 0 && (
          <View style={styles.vazio}>
            <Text style={styles.vazioIcone}>✅</Text>
            <Text style={styles.vazioTexto}>Tudo enviado.</Text>
          </View>
        )}

        {itens.map((item) => (
          <View key={item.id} style={[styles.cartao, item.status === 'erro' && styles.cartaoErro]}>
            <View style={styles.linhaTitulo}>
              <Text style={styles.cartaoTitulo}>{ROTULO_OPERACAO[item.operacao] ?? item.operacao}</Text>
              <Text style={[styles.status, item.status === 'erro' && styles.statusErro]}>
                {ROTULO_STATUS[item.status]}
              </Text>
            </View>
            <Text style={styles.cartaoTexto}>{formatarDataHora(item.criadoEm)}</Text>
            {item.ultimoErro && <Text style={styles.mensagem}>{item.ultimoErro}</Text>}

            {item.status === 'erro' && (
              <View style={styles.acoes}>
                <TouchableOpacity onPress={() => reenviar(item.id)}>
                  <Text style={styles.acao}>Tentar de novo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remover(item)}>
                  <Text style={[styles.acao, styles.acaoPerigo]}>Descartar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {itens.some((i) => i.status === 'pendente') && (
          <TouchableOpacity
            style={[styles.botao, !online && styles.botaoDesabilitado]}
            onPress={enviarAgora}
            disabled={!online}
          >
            <Text style={styles.botaoTexto}>Enviar agora</Text>
          </TouchableOpacity>
        )}
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
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  vazioIcone: { fontSize: 36, marginBottom: 8 },
  vazioTexto: { fontSize: 15, color: Paleta.textoSuave },
  cartao: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  cartaoErro: { borderColor: '#FECDCA', backgroundColor: '#FFFBFA' },
  linhaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cartaoTitulo: { flexShrink: 1, fontSize: 16, fontWeight: 'bold', color: Paleta.texto },
  status: { fontSize: 12, fontWeight: 'bold', color: Paleta.textoSecundario },
  statusErro: { color: '#B42318' },
  cartaoTexto: { fontSize: 13, color: Paleta.textoSuave, marginTop: 4 },
  mensagem: { fontSize: 14, color: Paleta.texto, marginTop: 8 },
  acoes: { flexDirection: 'row', gap: 18, marginTop: 12 },
  acao: { fontSize: 14, fontWeight: 'bold', color: Paleta.primaria },
  acaoPerigo: { color: '#B42318' },
  botao: {
    marginTop: 8,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Paleta.primaria,
  },
  botaoDesabilitado: { backgroundColor: Paleta.desabilitado },
  botaoTexto: { color: Paleta.textoSobrePrimaria, fontSize: 16, fontWeight: 'bold' },
});
