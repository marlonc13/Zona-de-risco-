import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Explore() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alertas</Text>
      <Text style={styles.text}>Use a aba Mapa para ver e criar alertas. A leitura de QR Code foi removida.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '900', color: '#202124', marginBottom: 8 },
  text: { fontSize: 16, color: '#5f6368', textAlign: 'center', lineHeight: 22 },
});
