import React, { useEffect, useState } from 'react';
import { View, Button, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './LoginScreen.styles';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '381656913472-1bgmo39lpsvk1kqd1imrta17pflp9e0f.apps.googleusercontent.com',
  });

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        router.replace('/(tabs)/index'); 
      } else {
        setLoading(false); 
      }
    };
    checkLogin();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      AsyncStorage.setItem('userToken', authentication.accessToken); 
      router.replace('/(tabs)/index'); 
    }
  }, [response]);

  const enterWithoutLogin = async () => {
    await AsyncStorage.setItem('userToken', 'guest'); 
    router.replace('/(tabs)/index');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Button
        disabled={!request}
        title="Login com Google"
        onPress={() => promptAsync()}
      />
      <View style={{ height: 20 }} />
      <Button
        title="Entrar sem login"
        onPress={enterWithoutLogin}
      />
    </View>
  );
}