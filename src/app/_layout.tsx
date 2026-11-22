
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Paleta } from '@/constants/paleta';
import { AuthProvider } from '@/context/AuthContext';
import { CarrinhoProvider } from '@/context/CarrinhoContext';
import { FavoritosProvider } from '@/context/FavoritosContext';
import { SyncProvider } from '@/context/SyncContext';
import { migrar, NOME_BANCO } from '@/database/migracoes';

SplashScreen.preventAutoHideAsync();

const TEMA: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Paleta.primaria,
    background: Paleta.fundo,
    card: Paleta.superficie,
    text: Paleta.texto,
    border: Paleta.borda,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={TEMA}>
      <AuthProvider>
        <SQLiteProvider databaseName={NOME_BANCO} onInit={migrar}>
          <SyncProvider>
            <CarrinhoProvider>
              <FavoritosProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </FavoritosProvider>
            </CarrinhoProvider>
          </SyncProvider>
        </SQLiteProvider>
      </AuthProvider>

      <AnimatedSplashOverlay />
    </ThemeProvider>
  );
}
