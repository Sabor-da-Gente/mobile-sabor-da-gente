import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { CarrinhoProvider } from '@/context/CarrinhoContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <CarrinhoProvider>
        <AnimatedSplashOverlay />

        {/* Todas as telas usam cabeçalho próprio (botão "Voltar" dentro da tela). */}
        <Stack screenOptions={{ headerShown: false }} />
      </CarrinhoProvider>
    </ThemeProvider>
  );
}
