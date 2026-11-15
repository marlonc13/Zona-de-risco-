import { useEffect } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import estilosIndex from '../styles/index.styles';
import { useEstilos, useTema } from '../hooks/use-tema';

export default function SplashScreen() {
  const router = useRouter();
  const styles = useEstilos(estilosIndex);
  const { cores } = useTema();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/inicio'); 
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/splash-icon.png')} 
        style={styles.logo} 
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={cores.tint} style={{ marginTop: 24 }} />
    </View>
  );
}
