import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Paleta } from '@/constants/paleta';
import { useFavoritos } from '@/context/FavoritosContext';
import type { AlvoFavorito } from '@/repositories/FavoritoRepository';

/** Coração que liga e desliga o favorito. */
export function BotaoFavorito({ alvo, nome }: { alvo: AlvoFavorito; nome: string }) {
  const { ehFavorito, alternar } = useFavoritos();
  const ativo = ehFavorito(alvo);

  return (
    <TouchableOpacity
      style={styles.botao}
      onPress={() => alternar(alvo)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={ativo ? `Tirar ${nome} dos favoritos` : `Favoritar ${nome}`}
      accessibilityState={{ selected: ativo }}
    >
      <Text style={[styles.icone, ativo && styles.iconeAtivo]}>{ativo ? '♥' : '♡'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botao: { padding: 4 },
  icone: { fontSize: 24, color: Paleta.textoSuave },
  iconeAtivo: { color: Paleta.primaria },
});
