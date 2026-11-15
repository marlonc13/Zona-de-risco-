import React from 'react';
import { View } from 'react-native';
import { Text } from '../../components/texto';
import estilosExplore from '../../styles/explore.styles';
import { useEstilos } from '../../hooks/use-tema';

export default function Explore() {
  const styles = useEstilos(estilosExplore);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alertas</Text>
      <Text style={styles.text}>Use a aba Mapa para ver e criar alertas. A leitura de QR Code foi removida.</Text>
    </View>
  );
}
