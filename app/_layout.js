import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { ThemeProvider as CustomThemeProvider } from '../contexts/ThemeContext';
import { FonteProvider, useFonte } from '../contexts/FonteContext';
import { useTema } from '../hooks/use-tema';

// Tema da navegação: cor do header, do título e do fundo entre as telas
function temaNavegacao(escuro, cores) {
  const base = escuro ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: cores.tint,
      card: cores.header,
      text: cores.textStrong,
      border: cores.border,
      background: escuro ? cores.screen : base.colors.background,
    },
  };
}

// Tamanho padrão do título do header da Stack em cada plataforma
const TAMANHO_TITULO_HEADER = Platform.select({ ios: 17, android: 20, default: 18 });

function RootLayoutContent() {
  const { escuro, cores } = useTema();
  const { letraGrande, escala } = useFonte();

  // Com "Letras grandes" o título do header cresce junto (o header nativo corta com "..." se não couber)
  const screenOptions = letraGrande ? { headerTitleStyle: { fontSize: TAMANHO_TITULO_HEADER * escala } } : undefined;

  return (
    <NavigationThemeProvider value={temaNavegacao(escuro, cores)}>
      <Stack initialRouteName="index" screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="inicio" options={{ title: 'Inicio' , headerShown: false}} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="email-login" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="endereco" options={{ title: 'Minha residência' }} />
        <Stack.Screen name="familiares" options={{ title: 'Pessoas e locais favoritos' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="perfil" options={{ title: 'Perfil' }} />
        <Stack.Screen name="config" options={{ title: 'Configurações' }} />
        <Stack.Screen name="ocorrencia/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="administradores" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={escuro ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <CustomThemeProvider>
        <FonteProvider>
          <RootLayoutContent />
        </FonteProvider>
      </CustomThemeProvider>
    </SafeAreaProvider>
  );
}
