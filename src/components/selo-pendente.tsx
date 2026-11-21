import { StyleSheet, Text } from 'react-native';

import { Paleta } from '@/constants/paleta';

export function SeloPendente({ sincronizado }: { sincronizado: boolean }) {
  if (sincronizado) return null;
  return <Text style={styles.selo}>⏳ Aguardando envio</Text>;
}

const styles = StyleSheet.create({
  selo: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: 'bold',
    color: Paleta.texto,
    backgroundColor: Paleta.destaqueSuave,
  },
});
