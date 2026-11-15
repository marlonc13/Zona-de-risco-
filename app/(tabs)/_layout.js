import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entypo, FontAwesome5, Octicons } from '@expo/vector-icons';

import { useTema } from '../../hooks/use-tema';
import { useFonte } from '../../contexts/FonteContext';
import { Text } from '../../components/texto';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { observarStatusAdministrador } from '../../services/accessControl';

export default function TabLayout() {
  const { cores } = useTema();
  const { letraGrande } = useFonte();
  const [administrador, setAdministrador] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let pararAdmin = () => {};
    const pararAuth = onAuthStateChanged(auth, user => {
      pararAdmin();
      pararAdmin = observarStatusAdministrador(user, setAdministrador);
    });
    return () => { pararAuth(); pararAdmin(); };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: cores.tint,
        tabBarInactiveTintColor: cores.textMuted,
        headerShown: false,
        tabBarStyle: {
          height: (letraGrande ? 66 : 60) + insets.bottom,
          paddingBottom: insets.bottom,       
          backgroundColor: cores.tabBar,
          borderTopColor: cores.border,
        },
        // Rótulo em uma linha só: com "Letras grandes" ele encolhe se não couber na aba
        tabBarLabel: ({ color, children }) => (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{ color, fontSize: 12, fontWeight: '600', textAlign: 'center' }}
          >
            {children}
          </Text>
        ),
      }}
    >
      {/* 1ª Aba: Mapa */}
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => (
            <Entypo name="map" size={24} color={cores.icon} />
          ),
        }}
      />

      <Tabs.Screen
        name="abrigos"
        options={{
          title: 'Abrigos',
          tabBarIcon: () => (
            <FontAwesome5 name="house-user" size={24} color={cores.icon} />
          ),
        }}
      />

      <Tabs.Screen
        name="estatisticas"
        options={{
          title: 'Estatísticas',
          tabBarIcon: () => (
            <Octicons name="graph" size={24} color={cores.icon} />
          ),
        }}
      />

      
      <Tabs.Screen
        name="lista"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color }) => (
            <Entypo name="warning" size={24} color={cores.icon} />
          ),
        }}
      />

      <Tabs.Screen
        name="relatorio"
        options={{
          title: 'Relatório',
          href: administrador ? undefined : null,
          tabBarIcon: () => (
            <Entypo name="bar-graph" size={24} color={cores.icon} />
          ),
        }}
      />

      {/* Oculta a aba explore padrão do template */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
