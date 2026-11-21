import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Paleta } from '@/constants/paleta';
import { useSync } from '@/context/SyncContext';

function alteracoes(n: number): string {
  return n === 1 ? '1 alteração' : `${n} alterações`;
}

export function AvisoOffline() {
  const { online, pendentes, erros } = useSync();

  if (!online) {
    return (
      <View style={[styles.faixa, styles.offline]}>
        <Text style={styles.icone}>📡</Text>
        <Text style={styles.texto}>
          Sem conexão.{' '}
          {pendentes > 0
            ? `${alteracoes(pendentes)} aguardando envio.`
            : 'O que você fizer fica salvo e é enviado quando a internet voltar.'}
        </Text>
      </View>
    );
  }

  if (erros > 0) {
    return (
      <TouchableOpacity style={[styles.faixa, styles.erro]} onPress={() => router.push('/pendencias')}>
        <Text style={styles.icone}>⚠️</Text>
        <Text style={styles.texto}>
          {erros === 1 ? '1 alteração não pôde ser enviada.' : `${erros} alterações não puderam ser enviadas.`}
        </Text>
        <Text style={styles.acao}>Ver</Text>
      </TouchableOpacity>
    );
  }

  if (pendentes > 0) {
    return (
      <TouchableOpacity style={[styles.faixa, styles.enviando]} onPress={() => router.push('/pendencias')}>
        <Text style={styles.icone}>⏳</Text>
        <Text style={styles.texto}>Enviando {alteracoes(pendentes)}...</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  offline: { backgroundColor: '#EEF0F3', borderColor: '#D0D5DD' },
  erro: { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' },
  enviando: { backgroundColor: Paleta.destaqueSuave, borderColor: Paleta.destaque },
  icone: { fontSize: 18 },
  texto: { flex: 1, fontSize: 14, color: Paleta.texto },
  acao: { fontSize: 14, fontWeight: 'bold', color: Paleta.primaria },
});
