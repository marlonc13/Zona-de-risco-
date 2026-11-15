import { useState } from 'react';
import { View, TouchableOpacity, ImageBackground, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/texto';
import Icone from '../components/icone';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { authenticateWithBiometrics, definirBiometria, preferenciaBiometria } from '../services/biometricAuth';
import estilosEmailLogin, { locais } from '../styles/email-login.styles';
import { useEstilos, useTema } from '../hooks/use-tema';
import { verificarAdministrador } from '../services/accessControl';

export default function EmailLogin() {
  const router = useRouter();
  const styles = useEstilos(estilosEmailLogin);
  const insets = useSafeAreaInsets();
  const { tema, cores } = useTema();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const perguntarAtivarBiometria = () =>
    new Promise((resolve) => {
      Alert.alert(
        'Ativar biometria?',
        'Deseja usar a biometria do celular para proteger essa conta nas próximas vezes que abrir o app?',
        [
          { text: 'Agora não', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Ativar', onPress: () => resolve(true) },
        ],
        { cancelable: false }
      );
    });

  // Quem acabou de digitar a senha já se identificou; a biometria protege as próximas
  // aberturas do app (pedida na tela inicial). A pergunta aparece uma única vez por conta.
  const entrarNoApp = async (user) => {
    const administrador = await verificarAdministrador(user);

    if ((await preferenciaBiometria(user.uid)) === null) {
      if (await perguntarAtivarBiometria()) {
        const resultado = await authenticateWithBiometrics();
        if (resultado?.success) {
          await definirBiometria(user.uid, true);
        } else if (resultado?.indisponivel) {
          Alert.alert('Biometria não disponível', 'Cadastre uma biometria no celular e ative depois em Configurações.');
        }
      } else {
        await definirBiometria(user.uid, false);
      }
    }

    router.replace(administrador ? '/admin' : '/mapa');
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

      if (error.code === 'auth/email-already-in-use') {
        mensagem = 'Esse e-mail já tem conta. A tela foi alterada para "Entrar"; use a senha dessa conta.';
        setModoCadastro(false);
      }
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') mensagem = 'E-mail ou senha incorretos.';
      if (error.code === 'auth/user-not-found') mensagem = 'Conta não encontrada. Troque para "Criar conta".';
      if (error.code === 'auth/invalid-email') mensagem = 'Digite um e-mail válido.';
      if (error.code === 'auth/operation-not-allowed') mensagem = 'Ative o provedor E-mail/Senha no Firebase Authentication.';
      if (error.code === 'permission-denied') mensagem = 'A conta foi autenticada, mas o Firebase bloqueou a consulta do perfil. Publique as regras atualizadas do Firestore.';

      Alert.alert('Erro', mensagem);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ImageBackground source={require('../assets/images/fundoentrada.png')} style={styles.container} resizeMode="cover" blurRadius={1}>
      {/* Véu sobre a imagem: fica fora do ScrollView para cobrir a tela inteira */}
      <View style={styles.overlay}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingTop: Math.max(40, insets.top + 16), paddingBottom: 40 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
            <View style={styles.logo}>
              <Image 
                source={require('../assets/images/splash-icon.png')} 
                style={styles.logoImagem} 
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>{modoCadastro ? 'Criar conta' : 'Entrar'}</Text>
            <Text style={styles.subtitle}>Use seu e-mail e senha. Se quiser, ative a biometria para as próximas entradas.</Text>

            {modoCadastro && (
              <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor={locais[tema].placeholder}
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={locais[tema].placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.passwordBox}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Senha"
                placeholderTextColor={locais[tema].placeholder}
                value={senha}
                onChangeText={setSenha}
                secureTextEntry={!mostrarSenha}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setMostrarSenha(atual => !atual)}>
                <Icone nome={mostrarSenha ? 'olhoFechado' : 'olho'} size={20} color={cores.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={enviar} disabled={carregando}>
              {carregando ? <ActivityIndicator color={cores.onButton} /> : <Text style={styles.buttonText}>{modoCadastro ? 'Criar e entrar' : 'Entrar com senha'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => setModoCadastro(!modoCadastro)} disabled={carregando}>
              <Text style={styles.linkText}>{modoCadastro ? 'Já tenho conta' : 'Não tenho conta, criar agora'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.voltarButton} onPress={() => router.replace('/inicio')} disabled={carregando}>
              <Text style={styles.voltarText}>Voltar</Text>
            </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}