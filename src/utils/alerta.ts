import { Alert, Platform } from 'react-native';

/**
 * Avisos e confirmações que funcionam no celular e no navegador.
 *
 * No Android/iOS usa `Alert.alert`. No navegador, `Alert.alert` não exibe
 * nada (react-native-web), então usa `window.alert` / `window.confirm`.
 */
export function avisar(titulo: string, mensagem?: string): void {
  if (Platform.OS === 'web') {
    window.alert(mensagem ? `${titulo}\n\n${mensagem}` : titulo);
    return;
  }
  Alert.alert(titulo, mensagem);
}

/** Pergunta ao usuário e resolve `true` se ele confirmar. */
export function confirmar(
  titulo: string,
  mensagem: string,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensagem}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      titulo,
      mensagem,
      [
        { text: textoCancelar, style: 'cancel', onPress: () => resolve(false) },
        { text: textoConfirmar, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
