import { useEffect, useState } from 'react';
import { View, TouchableOpacity, ImageBackground, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/texto';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { verificarAdministrador } from '../services/accessControl';
import estilosInicio from '../styles/inicio.styles';
import { useEstilos } from '../hooks/use-tema';

export default function Inicio() {
  const router = useRouter();
  const styles = useEstilos(estilosInicio);
  const insets = useSafeAreaInsets();
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    const unsunscribe = onAuthStateChanged(auth, async(user) => {
      if (user) {
        try {
          const administrador = await verificarAdministrador(user);
          router.replace(administrador ? '/admin' : '/mapa');
        } catch (error) {
          console.error("Erro ao verificar perfil do usuário:", error);
          router.replace('/mapa');
        }
      } else {
      setVerificando(false);
      }
    });

    return () => unsunscribe();
  }, []);

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
