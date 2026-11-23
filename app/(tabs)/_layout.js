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
        // Rótulo em uma linha só e com o mesmo tamanho em todas as abas: encolher só o que
        // não cabe ("Estatísticas") deixava esse rótulo menor e desalinhado dos outros.
        // A margem negativa devolve ao rótulo o padding de 5 do botão interno da aba,
        // que o tabBarItemStyle não alcança — "Estatísticas" precisa da largura toda
        tabBarLabel: ({ color, children }) => (
          <Text
            escalavel={false}
            numberOfLines={1}
            maxFontSizeMultiplier={1.1}
            style={{ color, fontSize: letraGrande ? 12.5 : 11.5, fontWeight: '600', textAlign: 'center', marginHorizontal: -5 }}
          >
            {children}
          </Text>
        ),
      }}
    >
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
