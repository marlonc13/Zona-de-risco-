import React, { useEffect } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import styles from '../styles/index.styles';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/inicio'); 
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/images/icon.png')} 
        style={styles.logo} 
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#1a73e8" style={{ marginTop: 24 }} />
    </View>
  );
}