import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);


  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
      setLoading(false);
    };
    checkLogin();
  }, []);

 
  useEffect(() => {
    if (!loading) {
      if (!isLoggedIn) {
        router.replace('/login'); 
      } else {
        router.replace('/(tabs)/index'); 
      }
    }
  }, [loading, isLoggedIn]);

  if (loading) return null; 

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}