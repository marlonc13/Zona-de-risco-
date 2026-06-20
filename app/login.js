import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { useRouter } from 'expo-router';
import styles from '../styles/login.styles';

export default function Login() {
  const router = useRouter();

  return (
    <ImageBackground 
      source={require('../assets/images/fundoentrada.png')} 
      style={styles.container} 
      resizeMode="cover" 
      blurRadius={1}
    >
      <View style={styles.overlay}>
        <View style={styles.avatar}>
          <Image 
            source={require('../assets/images/icon.png')} 
            style={styles.logoImagem} 
            resizeMode="contain"
          />
        </View>

        <Text style={styles.nome}>Login</Text>
        <Text style={styles.subtitulo}>
          Entre com sua conta para publicar alertas. Sem login, você ainda consegue ver o mapa.
        </Text>


        <TouchableOpacity style={styles.emailBotao} onPress={() => router.push('/email-login')}>
          <Text style={styles.emailTexto}>Criar conta / entrar com e-mail</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.visitanteBotao} onPress={() => router.replace('/mapa')}>
          <Text style={styles.visitanteTexto}>Continuar como visitante</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.voltarBotao} onPress={() => router.replace('/')}>
          <Text style={styles.voltarTexto}>Voltar para tela inicial</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}