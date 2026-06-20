import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: false,
        tabBarStyle: {
          height: 90,          
          paddingBottom: 10,   
          paddingTop: 6,       
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
            <Text style={{ fontSize: 22 }}>🗺️</Text>
          ),
        }}
      />

      
      <Tabs.Screen
        name="lista"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22 }}>⚠️</Text>
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