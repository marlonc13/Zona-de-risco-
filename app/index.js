import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';

export default function Inicio() {
  const router = useRouter();

  return (
    <ImageBackground source={require('../assets/images/fundoentrada.png')} style={styles.container} resizeMode="cover" blurRadius={1}>
      <View style={styles.overlay}>
        <View style={styles.logo}><Text style={styles.logoText}>ZR</Text></View>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.82)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  logo: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 10, marginBottom: 18 },
  logoText: { fontSize: 34, fontWeight: '900', color: '#1a73e8' },
  title: { fontSize: 30, fontWeight: '900', color: '#202124' },
  subtitle: { fontSize: 16, color: '#444', textAlign: 'center', marginTop: 10, marginBottom: 28, lineHeight: 22 },
  primaryButton: { width: '100%', backgroundColor: '#1a73e8', paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryButton: { width: '100%', backgroundColor: '#fff', paddingVertical: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#dadce0' },
  secondaryText: { color: '#1a73e8', fontSize: 16, fontWeight: '800' },
  note: { marginTop: 18, color: '#5f6368', textAlign: 'center', fontSize: 13, lineHeight: 18 },
});
