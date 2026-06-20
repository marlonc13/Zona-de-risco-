import React from 'react';
import { View, Text } from 'react-native';
import styles from '../../styles/explore.styles';

export default function Explore() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alertas</Text>
      <Text style={styles.text}>Use a aba Mapa para ver e criar alertas. A leitura de QR Code foi removida.</Text>
    </View>
  );
}
