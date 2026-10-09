import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Entypo, FontAwesome5, Octicons } from '@expo/vector-icons';

import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { observarStatusAdministrador } from '../../services/accessControl';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
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
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: false,
        tabBarStyle: {
          height: 60 + insets.bottom,          
          paddingBottom: insets.bottom,       
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        }
      }}
    >
      {/* 1ª Aba: Mapa */}
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => (
            <Entypo name="map" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="abrigos"
        options={{
          title: 'Abrigos',
          tabBarIcon: () => (
            <FontAwesome5 name="house-user" size={24} color="black" />
          ),
        }}
      />

      <Tabs.Screen
        name="estatisticas"
        options={{
          title: 'Estatísticas',
          tabBarIcon: () => (
            <Octicons name="graph" size={24} color="black" />
          ),
        }}
      />

      
      <Tabs.Screen
        name="lista"
        options={{
          title: 'Alertas',
          href: administrador ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Entypo name="warning" size={24} color="black" />
          ),
        }}
      />

      <Tabs.Screen
        name="relatorio"
        options={{
          title: 'Relatório',
          href: administrador ? undefined : null,
          tabBarIcon: () => (
            <Entypo name="bar-graph" size={24} color="black" />
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
