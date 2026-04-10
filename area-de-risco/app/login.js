import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Alert
} from 'react-native';

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();

  const nome = "Usuário Teste";

  const iniciais = nome
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'SEU_CLIENT_ID_AQUI',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      Alert.alert('Login realizado!', 'Você entrou com sucesso!');

      AsyncStorage.setItem('isLoggedIn', 'true');

      router.replace('/tabs');
    }
  }, [response]);

  return (
    <ImageBackground
      source={require('../assets/images/fundoentrada.png')}
      style={styles.container}
      blurRadius={5}
    >
      <View style={styles.overlay}>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{iniciais}</Text>
        </View>

        <Text style={styles.nome}>{nome}</Text>

        <TouchableOpacity
          style={styles.botao}
          onPress={() => router.replace('/(tabs)')} 
        >
          <Text style={styles.botaoTexto}>ENTRAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!request}
          onPress={() => promptAsync()}
        >
          <Text style={styles.google}>Entrar com Google</Text>
        </TouchableOpacity>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#777',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  avatarText: {
    fontSize: 24,
    color: '#fff',
  },

  nome: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 40,
  },

  botao: {
    backgroundColor: '#aaa',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 20,
    marginBottom: 10,
  },

  botaoTexto: {
    fontSize: 20,
    color: '#fff',
  },

  google: {
    color: '#fff',
    marginTop: 10,
  }
});