import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ImageBackground, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { authenticateWithBiometrics } from '../services/biometricAuth';

export default function EmailLogin() {
  const router = useRouter();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const entrarNoApp = async (user) => {
    await AsyncStorage.setItem('userToken', await user.getIdToken());
    await AsyncStorage.setItem('userName', user.displayName || nome.trim() || 'Usuário');
    await AsyncStorage.setItem('userEmail', user.email || email.trim());
    await AsyncStorage.setItem('biometriaAtiva', 'true');

    const resultado = await authenticateWithBiometrics();

    if (resultado?.success) {
      router.replace('/mapa');
      return;
    }

    if (resultado?.message === 'Sem suporte a biometria' || resultado?.message === 'Cadastre biometria no celular') {
      Alert.alert('Biometria não disponível', 'O login foi feito. Cadastre biometria no celular para usar essa proteção nas próximas entradas.');
      router.replace('/mapa');
      return;
    }

    await signOut(auth);
    Alert.alert('Biometria necessária', 'Para entrar, confirme sua biometria.');
  };

  const enviar = async () => {
    const emailLimpo = email.trim().toLowerCase();
    const senhaLimpa = senha.trim();
    const nomeLimpo = nome.trim();

    if (modoCadastro && !nomeLimpo) {
      Alert.alert('Nome obrigatório', 'Digite seu nome para criar a conta.');
      return;
    }

    if (!emailLimpo || !senhaLimpa) {
      Alert.alert('Campos obrigatórios', 'Digite e-mail e senha.');
      return;
    }

    if (senhaLimpa.length < 6) {
      Alert.alert('Senha curta', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    try {
      setCarregando(true);
      let credencial;

      if (modoCadastro) {
        credencial = await createUserWithEmailAndPassword(auth, emailLimpo, senhaLimpa);
        await updateProfile(credencial.user, { displayName: nomeLimpo });
      } else {
        credencial = await signInWithEmailAndPassword(auth, emailLimpo, senhaLimpa);
      }

      await entrarNoApp(credencial.user);
    } catch (error) {
      console.error('Erro no login por e-mail:', error);
      let mensagem = 'Não consegui concluir o login.';

      if (error.code === 'auth/email-already-in-use') mensagem = 'Esse e-mail já tem conta. Troque para "Entrar" em vez de criar conta.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') mensagem = 'E-mail ou senha incorretos.';
      if (error.code === 'auth/user-not-found') mensagem = 'Conta não encontrada. Troque para "Criar conta".';
      if (error.code === 'auth/invalid-email') mensagem = 'Digite um e-mail válido.';
      if (error.code === 'auth/operation-not-allowed') mensagem = 'Ative o provedor E-mail/Senha no Firebase Authentication.';

      Alert.alert('Erro', mensagem);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ImageBackground source={require('../assets/images/fundoentrada.png')} style={styles.container} resizeMode="cover" blurRadius={1}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.logo}><Text style={styles.logoText}>ZR</Text></View>
        <Text style={styles.title}>{modoCadastro ? 'Criar conta' : 'Entrar'}</Text>
        <Text style={styles.subtitle}>Use e-mail e senha. Depois confirme a biometria para acessar.</Text>

        {modoCadastro && (
          <TextInput
            style={styles.input}
            placeholder="Nome"
            placeholderTextColor="#777"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#777"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#777"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={enviar} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{modoCadastro ? 'Criar e entrar' : 'Entrar com senha'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => setModoCadastro(!modoCadastro)} disabled={carregando}>
          <Text style={styles.linkText}>{modoCadastro ? 'Já tenho conta' : 'Não tenho conta, criar agora'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.visitanteButton} onPress={() => router.replace('/mapa')} disabled={carregando}>
          <Text style={styles.visitanteText}>Continuar como visitante</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.voltarButton} onPress={() => router.replace('/login')} disabled={carregando}>
          <Text style={styles.voltarText}>Voltar</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.84)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  logo: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 8 },
  logoText: { fontSize: 32, fontWeight: '900', color: '#1a73e8' },
  title: { fontSize: 28, fontWeight: '900', color: '#202124' },
  subtitle: { fontSize: 15, color: '#444', textAlign: 'center', marginTop: 8, marginBottom: 22, lineHeight: 21 },
  input: { width: '100%', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#dadce0', color: '#202124' },
  button: { width: '100%', backgroundColor: '#1a73e8', paddingVertical: 15, borderRadius: 15, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  linkButton: { marginTop: 15, padding: 8 },
  linkText: { color: '#1a73e8', fontWeight: '800' },
  visitanteButton: { width: '100%', backgroundColor: '#fff', paddingVertical: 14, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#dadce0', marginTop: 8 },
  visitanteText: { color: '#1a73e8', fontWeight: '800', fontSize: 15 },
  voltarButton: { marginTop: 10, padding: 8 },
  voltarText: { color: '#5f6368', fontWeight: '700' },
});
