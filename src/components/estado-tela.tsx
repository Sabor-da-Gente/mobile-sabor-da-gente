import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const VINHO = '#8B1E1E';

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color={VINHO} />
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

export function ErroTela({ erro, titulo = 'Não foi possível carregar' }: { erro?: Error; titulo?: string }) {
  if (erro) console.error(erro);
  return (
    <View style={styles.centro}>
      <Text style={styles.icone}>⚠️</Text>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.texto}>Feche e abra o app novamente.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  icone: {
    fontSize: 40,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D2D2D',
    textAlign: 'center',
  },
  texto: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
  },
});
