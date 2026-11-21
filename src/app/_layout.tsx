
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Sincronizacao } from '@/components/sincronizacao';
import { AuthProvider } from '@/context/AuthContext';
import { CarrinhoProvider } from '@/context/CarrinhoContext';
import { FavoritosProvider } from '@/context/FavoritosContext';
import { migrar, NOME_BANCO } from '@/database/migracoes';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <SQLiteProvider databaseName={NOME_BANCO} onInit={migrar}>
          <Sincronizacao />
          <CarrinhoProvider>
            <FavoritosProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </FavoritosProvider>
          </CarrinhoProvider>
        </SQLiteProvider>
      </AuthProvider>

      <AnimatedSplashOverlay />
    </ThemeProvider>
  );
}
