import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { useRouter } from 'expo-router';

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.78)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  avatar: { width: 95, height: 95, borderRadius: 48, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 10, overflow: 'hidden' },
  // Estilo novo para controlar o tamanho da logo dentro do círculo
  logoImagem: { width: '70%', height: '70%' }, 
  nome: { fontSize: 26, fontWeight: 'bold', color: '#202124' },
  subtitulo: { fontSize: 15, color: '#444', marginTop: 8, marginBottom: 28, textAlign: 'center', lineHeight: 21 },
  emailBotao: { marginTop: 14, backgroundColor: '#fff', width: '100%', paddingVertical: 14, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#dadce0' },
  emailTexto: { color: '#1a73e8', fontWeight: '800', fontSize: 15 },
  visitanteBotao: { marginTop: 14, backgroundColor: '#1a73e8', width: '100%', paddingVertical: 14, borderRadius: 15, alignItems: 'center' },
  visitanteTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
  voltarBotao: { marginTop: 12, padding: 10 },
  voltarTexto: { color: '#1a73e8', fontWeight: '700' },
});