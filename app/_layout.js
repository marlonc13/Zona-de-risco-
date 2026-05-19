import { DarkTheme, DefaultTheme, ThemeProvider as NavigationProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

// Adicione o '(tabs)' ao caminho
import { ThemeProvider as CustomThemeProvider, useTheme } from './(tabs)/context/ThemeContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Acessa o tema ativo do seu contexto customizado
  const { activeTheme } = useTheme();

  useEffect(() => {
    const checkLogin = async () => {
      // Verifica o token salvo para decidir a rota inicial
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
      setLoading(false);
    };
    checkLogin();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!isLoggedIn) {
        router.replace('/login'); // Redireciona se não houver token
      } else {
        router.replace('/(tabs)/index'); // Redireciona para a home se logado
      }
    }
  }, [loading, isLoggedIn]);

  if (loading) return null;

  return (
    // O NavigationProvider garante que as cores internas das rotas (como títulos) 
    // acompanhem o seu activeTheme (light ou dark)
    <NavigationProvider value={activeTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
    </NavigationProvider>
  );
}

// O componente principal envolve tudo com o CustomThemeProvider para que 
// o useTheme() funcione dentro do RootLayoutContent
export default function RootLayout() {
  return (
    <CustomThemeProvider>
      <RootLayoutContent />
    </CustomThemeProvider>
  );
}