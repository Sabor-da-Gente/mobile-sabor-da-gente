import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { CarrinhoProvider } from '@/context/CarrinhoContext';
import { FavoritosProvider } from '@/context/FavoritosContext';
import { migrar, NOME_BANCO } from '@/database/migracoes';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Abre o banco e roda as migrações antes de mostrar qualquer tela. */}
      <SQLiteProvider databaseName={NOME_BANCO} onInit={migrar}>
        <CarrinhoProvider>
          <FavoritosProvider>
            {/* Todas as telas usam cabeçalho próprio (botão "Voltar" dentro da tela). */}
            <Stack screenOptions={{ headerShown: false }} />
          </FavoritosProvider>
        </CarrinhoProvider>
      </SQLiteProvider>

      <AnimatedSplashOverlay />
    </ThemeProvider>
  );
}
