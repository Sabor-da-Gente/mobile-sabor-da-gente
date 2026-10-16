import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Paleta } from '@/constants/paleta';

/** Barra no rodapé confirmando que algo entrou no carrinho. Some sozinha em 4 s. */
export function BarraAdicionado({ mensagem, onFechar }: { mensagem: string; onFechar: () => void }) {
  useEffect(() => {
    const cronometro = setTimeout(onFechar, 4000);
    return () => clearTimeout(cronometro);
  }, [mensagem, onFechar]);

  return (
    <View style={styles.barra}>
      <Text style={styles.texto} numberOfLines={2}>
        ✓ {mensagem}
      </Text>

      <TouchableOpacity
        onPress={() => {
          onFechar();
          router.push('/carrinho');
        }}
      >
        <Text style={styles.acao}>Ver carrinho</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Paleta.texto,
  },
  texto: { flex: 1, fontSize: 14, color: Paleta.textoSobrePrimaria },
  acao: { fontSize: 14, fontWeight: 'bold', color: Paleta.destaque },
});
