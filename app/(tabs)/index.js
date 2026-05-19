import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/theme';
import { authenticateWithBiometrics } from '../../services/biometricAuth';

// Exemplo de dados de áreas afetadas (Poderia vir de uma API)
const AREAS_AFETADAS = [
  { id: 1, latitude: -22.4710, longitude: -43.8210, tipo: 'Alagamento', severidade: 'Alta' },
  { id: 2, latitude: -22.4650, longitude: -43.8150, tipo: 'Risco de Deslizamento', severidade: 'Media' },
];

export default function MapScreen() {
  const router = useRouter();
  const [fullscreen, setFullscreen] = useState(false);
  const [tema, setTema] = useState('light');
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');

  const nome = "Aline Lasneau";

  // 1. Performance: useMemo evita reprocessar o nome desnecessariamente
  const iniciais = useMemo(() => {
    return nome.split(" ").map(n => n[0]).join("").toUpperCase();
  }, [nome]);

  useEffect(() => {
    const carregarTema = async () => {
      try {
        const temaSalvo = await AsyncStorage.getItem('tema');
        if (temaSalvo) setTema(temaSalvo);
      } catch (e) {
        console.error("Erro ao carregar tema", e);
      }
    };
    carregarTema();
  }, []);

  const handleBiometric = async () => {
    const result = await authenticateWithBiometrics();
    if (result.success) {
      Alert.alert('Sucesso', 'Identidade confirmada para acesso restrito.');
    } else {
      Alert.alert('Erro', result.message || 'Falha na autenticação');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[tema].background }]}>

      <MapView
        provider={PROVIDER_GOOGLE} // Melhor performance e visual
        style={styles.map}
        showsUserLocation={true} // 2. UX: Mostra onde o usuário está
        showsMyLocationButton={false} 
        initialRegion={{
          latitude: -22.47,
          longitude: -43.82,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* 3. Visualização de Áreas de Risco */}
        {AREAS_AFETADAS.map(area => (
          <Circle
            key={area.id}
            center={{ latitude: area.latitude, longitude: area.longitude }}
            radius={350}
            fillColor={area.severidade === 'Alta' ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 165, 0, 0.4)'}
            strokeColor={area.severidade === 'Alta' ? 'red' : 'orange'}
            strokeWidth={1}
          />
        ))}
      </MapView>

      {/* Interface Superior */}
      {!fullscreen && (
        <View style={styles.overlayWrapper}>
          <View style={[styles.topBar, { backgroundColor: Colors[tema].card }]}>
            <TouchableOpacity
              style={[styles.profile, { backgroundColor: Colors[tema].avatar }]}
              onPress={() => router.push('/perfil')}
            >
              <Text style={[styles.profileText, { color: Colors[tema].text }]}>{iniciais}</Text>
            </TouchableOpacity>

            <Text style={[styles.title, { color: Colors[tema].text }]}>Áreas Afetadas</Text>

            <TouchableOpacity style={styles.config} onPress={() => router.push('/config')}>
              <Text style={[styles.icon, { color: Colors[tema].text }]}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* 4. Filtros para facilitar a navegação */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
            {['Todos', 'Alagamentos', 'Deslizamentos', 'Bloqueios'].map(f => (
              <TouchableOpacity 
                key={f} 
                onPress={() => setFiltroAtivo(f)}
                style={[styles.chip, { backgroundColor: filtroAtivo === f ? Colors[tema].primary : Colors[tema].card }]}
              >
                <Text style={{ color: filtroAtivo === f ? '#fff' : Colors[tema].text }}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Botão de Tela Cheia (Lado Esquerdo) */}
      <TouchableOpacity
        style={[styles.floatingButton, styles.leftButton, { backgroundColor: Colors[tema].card }]}
        onPress={() => setFullscreen(!fullscreen)}
      >
        <Text style={{ fontSize: 18 }}>{fullscreen ? '✕' : '⛶'}</Text>
      </TouchableOpacity>

      {/* 5. Biometria como FAB (Floating Action Button) - Padrão de Mapas */}
      {!fullscreen && (
        <TouchableOpacity
          style={[styles.floatingButton, styles.rightButton, { backgroundColor: Colors[tema].primary }]}
          onPress={handleBiometric}
        >
          <Text style={{ color: '#fff', fontSize: 20 }}>👤</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  overlayWrapper: {
    position: 'absolute',
    top: 50,
    left: 15,
    right: 15,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  filterBar: {
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    elevation: 2,
  },
  profile: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 14, fontWeight: 'bold' },
  title: { fontSize: 16, fontWeight: '600' },
  config: { padding: 5 },
  icon: { fontSize: 20 },
  
  // Estilo unificado para botões flutuantes
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  leftButton: { left: 20 },
  rightButton: { right: 20 },
});