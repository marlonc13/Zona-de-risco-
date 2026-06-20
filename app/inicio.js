import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { useRouter } from 'expo-router';
import styles from '../styles/inicio.styles';

export default function Inicio() {
  const router = useRouter();

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
        <Text style={styles.subtitle}>Veja alertas próximos no mapa ou entre para criar novas marcações.</Text>

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/mapa')}>
          <Text style={styles.primaryText}>Entrar como visitante</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.secondaryText}>Fazer login / criar conta</Text>
        </TouchableOpacity>

        <Text style={styles.note}>Visitantes conseguem ver alertas. Para publicar alerta com foto, é necessário login.</Text>
      </View>
    </ImageBackground>
  );
}