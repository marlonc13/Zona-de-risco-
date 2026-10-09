import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { verificarAdministrador } from '../services/accessControl';
import styles from '../styles/inicio.styles';

export default function Inicio() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVerificando(false),  3000);

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
        <View style={styles.overlay}>
          <View style={styles.logo}>
            <Image 
              source={require('../assets/images/icon.png')} 
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
