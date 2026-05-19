import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Alert,
  Image
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
      router.replace('/(tabs)'); 
    }
  }, [response]);

  return (
    <ImageBackground
      
      source={require('../assets/images/fundoentrada.png')} 
      style={styles.container}
      resizeMode="cover" 
      blurRadius={1} 
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
          style={styles.googleBotao}
          disabled={!request}
          onPress={() => promptAsync()}
        >
          <Image 
            source={{ uri: 'https://img.icons8.com/color/48/000000/google-logo.png' }} 
            style={styles.googleIcone} 
          />
          <Text style={styles.googleTexto}>Entrar com Google</Text>
        </TouchableOpacity>

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  overlay: {
    flex: 1,
    // Aumentei um pouco a opacidade do branco (0.5) para facilitar a leitura sobre o mapa
    backgroundColor: 'rgba(255, 255, 255, 0.5)', 
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0057FF',
  },
  nome: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 50,
  },
  botao: {
    backgroundColor: '#0057FF',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
  },
  botaoTexto: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1.1,
  },
  googleBotao: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  googleIcone: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  googleTexto: {
    fontSize: 16,
    color: '#444',
    fontWeight: '500',
  }
});