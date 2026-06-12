import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Alert, Image, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import app from '../services/firebaseConfig';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();
const auth = getAuth(app);

const WEB_CLIENT_ID = 'COLE_SEU_WEB_CLIENT_ID_AQUI.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = 'COLE_SEU_ANDROID_CLIENT_ID_AQUI.apps.googleusercontent.com';

export default function Login() {
  const router = useRouter();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    const loginComGoogle = async () => {
      if (response?.type !== 'success') return;

      try {
        const idToken = response.authentication?.idToken || response.params?.id_token;
        if (!idToken) {
          Alert.alert('Login Google', 'Não consegui concluir o login com Google. Use e-mail/senha por enquanto.');
          return;
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        await AsyncStorage.setItem('userToken', await user.getIdToken());
        await AsyncStorage.setItem('userName', user.displayName || 'Usuário');
        await AsyncStorage.setItem('userEmail', user.email || '');
        await AsyncStorage.setItem('biometriaAtiva', 'true');

        Alert.alert('Login realizado!', 'Agora você pode criar alertas.');
        router.replace('/mapa');
      } catch (error) {
        console.error('Erro no login Google:', error);
        Alert.alert('Erro no login Google', 'Não foi possível concluir o login com Google. Use e-mail/senha por enquanto.');
      }
    };

    loginComGoogle();
  }, [response]);

  const entrarComGoogle = async () => {
    try {
      if (!request) return;
      await promptAsync();
    } catch (error) {
      console.error('Erro ao abrir login Google:', error);
      Alert.alert('Erro no Google', 'Não consegui abrir o login Google. Use e-mail/senha por enquanto.');
    }
  };

  return (
    <ImageBackground source={require('../assets/images/fundoentrada.png')} style={styles.container} resizeMode="cover" blurRadius={1}>
      <View style={styles.overlay}>
        <View style={styles.avatar}><Text style={styles.avatarText}>ZR</Text></View>
        <Text style={styles.nome}>Login</Text>
        <Text style={styles.subtitulo}>Entre com Google para publicar alertas. Sem login, você ainda consegue ver o mapa.</Text>

        <TouchableOpacity style={[styles.googleBotao, !request && styles.botaoAviso]} onPress={entrarComGoogle} disabled={!request}>
          <Image source={{ uri: 'https://img.icons8.com/color/48/000000/google-logo.png' }} style={styles.googleIcone} />
          <Text style={styles.googleTexto}>Entrar com Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.emailBotao} onPress={() => router.push('/email-login')}>
          <Text style={styles.emailTexto}>Criar conta / entrar com e-mail</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.visitanteBotao} onPress={() => router.replace('/mapa')}>
          <Text style={styles.visitanteTexto}>Continuar como visitante</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.voltarBotao} onPress={() => router.replace('/')}>
          <Text style={styles.voltarTexto}>Voltar para tela inicial</Text>
        </TouchableOpacity>

        {!request && <ActivityIndicator style={{ marginTop: 15 }} />}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.78)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  avatar: { width: 95, height: 95, borderRadius: 48, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 10 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#1a73e8' },
  nome: { fontSize: 26, fontWeight: 'bold', color: '#202124' },
  subtitulo: { fontSize: 15, color: '#444', marginTop: 8, marginBottom: 28, textAlign: 'center', lineHeight: 21 },
  googleBotao: { flexDirection: 'row', backgroundColor: '#FFFFFF', width: '100%', paddingVertical: 14, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDD', marginTop: 10 },
  botaoAviso: { opacity: 0.82 },
  googleIcone: { width: 22, height: 22, marginRight: 10 },
  googleTexto: { fontSize: 16, color: '#444', fontWeight: '700' },
  emailBotao: { marginTop: 14, backgroundColor: '#fff', width: '100%', paddingVertical: 14, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#dadce0' },
  emailTexto: { color: '#1a73e8', fontWeight: '800', fontSize: 15 },
  visitanteBotao: { marginTop: 14, backgroundColor: '#1a73e8', width: '100%', paddingVertical: 14, borderRadius: 15, alignItems: 'center' },
  visitanteTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
  voltarBotao: { marginTop: 12, padding: 10 },
  voltarTexto: { color: '#1a73e8', fontWeight: '700' },
  aviso: { marginTop: 18, textAlign: 'center', color: '#b06000', fontSize: 13, lineHeight: 18 },
});
