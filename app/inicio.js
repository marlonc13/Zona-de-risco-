import { useEffect, useState } from 'react';
import { View, TouchableOpacity, ImageBackground, Image, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/texto';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { verificarAdministrador } from '../services/accessControl';
import { authenticateWithBiometrics, preferenciaBiometria } from '../services/biometricAuth';
import estilosInicio from '../styles/inicio.styles';
import { useEstilos } from '../hooks/use-tema';

export default function Inicio() {
  const router = useRouter();
  const styles = useEstilos(estilosInicio);
  const insets = useSafeAreaInsets();
  const [verificando, setVerificando] = useState(true);

  // Trata só a sessão que já existia ao abrir o app. O login feito na tela de e-mail
  // cuida da própria navegação, então os eventos seguintes são ignorados aqui.
  useEffect(() => {
    let tratado = false;
    const parar = onAuthStateChanged(auth, async user => {
      if (tratado) return;
      tratado = true;

      if (!user) {
        setVerificando(false);
        return;
      }

      if (await preferenciaBiometria(user.uid)) {
        const resultado = await authenticateWithBiometrics();
        // sem biometria no aparelho (removida ou não cadastrada) a entrada segue normalmente
        if (!resultado?.success && !resultado?.indisponivel) {
          await signOut(auth);
          setVerificando(false);
          Alert.alert('Biometria não confirmada', 'Entre novamente com seu e-mail e senha.');
          return;
        }
      }

      const administrador = await verificarAdministrador(user);
      router.replace(administrador ? '/admin' : '/mapa');
    });
    return () => parar();
  }, [router]);

  if (verificando) {
    return (
      <ImageBackground 
        source={require('../assets/images/fundoentrada.png')} 
        style={styles.container} 
        resizeMode="cover" 
        blurRadius={1}
      >
        <View style={[styles.overlay, { justifyContent: 'center', alignItems: 'center'}]}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </ImageBackground>
      );
  } 

    return (
      <ImageBackground 
        source={require('../assets/images/fundoentrada.png')} 
        style={styles.container} 
        resizeMode="cover" 
        blurRadius={1}
      >
        <View style={[styles.overlay, { paddingTop: 28 + insets.top, paddingBottom: 28 + insets.bottom }]}>
          <View style={styles.logo}>
            <Image 
              source={require('../assets/images/splash-icon.png')} 
              style={styles.logoImagem} 
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>Zona de Risco</Text>
          <Text style={styles.subtitle}>Receba alertas de riscos naturais próximos da sua localização.</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/mapa')}>
            <Text style={styles.primaryText}>Entrar como visitante</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/email-login')}>
            <Text style={styles.secondaryText}>Fazer login / criar conta</Text>
          </TouchableOpacity>

          <Text style={styles.note}>Visitantes e usuários consultam alertas. Somente administradores publicam ocorrências.</Text>
        </View>
      </ImageBackground>
    );
}
