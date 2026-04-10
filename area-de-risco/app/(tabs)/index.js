import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import MapView from 'react-native-maps';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/theme';
import { authenticateWithBiometrics } from '../../services/biometricAuth';

export default function MapScreen() {
  const router = useRouter();
  const [fullscreen, setFullscreen] = useState(false);
  const [tema, setTema] = useState('light');

  const nome = "Aline Lasneau";

  const iniciais = nome
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();

  // 🔥 carregar tema
  useEffect(() => {
    const carregarTema = async () => {
      const temaSalvo = await AsyncStorage.getItem('tema');
      if (temaSalvo) setTema(temaSalvo);
    };

    carregarTema();
  }, []);

  const handleBiometric = async () => {
    const result = await authenticateWithBiometrics();

    if (result.success) {
      Alert.alert('Sucesso', 'Biometria reconhecida!');
    } else {
      Alert.alert('Erro', result.message || 'Falha na autenticação');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[tema].background }]}>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -22.47,
          longitude: -43.82,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      />

      {!fullscreen && (
        <View style={[styles.topBar, { backgroundColor: Colors[tema].card }]}>

          <TouchableOpacity
            style={[styles.profile, { backgroundColor: Colors[tema].avatar }]}
            onPress={() => router.push('/perfil')}
          >
            <Text style={[styles.profileText, { color: Colors[tema].text }]}>
              {iniciais}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: Colors[tema].text }]}>
            Mapa de áreas afetadas
          </Text>

          <TouchableOpacity
            style={styles.config}
            onPress={() => router.push('/config')}
          >
            <Text style={[styles.icon, { color: Colors[tema].text }]}>⚙️</Text>
          </TouchableOpacity>

        </View>
      )}

      <TouchableOpacity
        style={[styles.fullscreen, { backgroundColor: Colors[tema].primary }]}
        onPress={() => setFullscreen(!fullscreen)}
      >
        <Text style={{ color: Colors[tema].background }}>
          {fullscreen ? 'X' : '{}'}
        </Text>
      </TouchableOpacity>

      {!fullscreen && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.bioButton, { backgroundColor: Colors[tema].primary }]}
            onPress={handleBiometric}
          >
            <Text style={{ color: Colors[tema].background }}>
              Biometria
            </Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  map: { flex: 1 },

  topBar: {
    position: 'absolute',
    top: 50,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
  },

  profile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileText: {
    fontSize: 16,
  },

  title: {
    fontSize: 16,
  },

  config: {
    padding: 5,
  },

  icon: {
    fontSize: 16,
  },

  fullscreen: {
    position: 'absolute',
    bottom: 70,
    left: 20,
    padding: 10,
    borderRadius: 10,
  },

  buttonContainer: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
  },

  bioButton: {
    padding: 10,
    borderRadius: 10,
  },
});