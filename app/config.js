import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';

export default function Config() {

  const [tema, setTema] = useState('light');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    carregarTema();
  }, []);

  const carregarTema = async () => {
    const temaSalvo = await AsyncStorage.getItem('tema');

    if (temaSalvo) {
      setTema(temaSalvo);
      setIsDark(temaSalvo === 'dark');
    }
  };

const mudarTema = async (value) => {
  const novoTema = value ? 'dark' : 'light';

  setIsDark(value);     // muda o switch
  setTema(novoTema);   // muda na tela

  await AsyncStorage.setItem('tema', novoTema); // SALVA
};

  const abrirIdioma = () => {
    alert('Tela de idioma (vamos fazer depois)');
  };

  const abrirFonte = () => {
    alert('Configurar tamanho da letra (depois)');
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[tema].background }]}>

      <Text style={styles.icon}>⚙️</Text>

      <View style={styles.row}>

        <View style={styles.option}>
          <Text style={styles.label}>Tema</Text>
          <Switch
            value={isDark}
            onValueChange={mudarTema}
          />
        </View>

        <TouchableOpacity style={styles.option} onPress={abrirIdioma}>
          <Text style={styles.label}>Idioma</Text>
          <Text style={styles.icon}>🌐</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={abrirFonte}>
          <Text style={styles.label}>Letras</Text>
          <Text style={styles.bigText}>Aa</Text>
        </TouchableOpacity>

      </View>

      <Text style={styles.footer}>Empresa SOS rodovia</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 80,
  },

  icon: {
    fontSize: 40,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },

  option: {
    alignItems: 'center',
    gap: 10,
  },

  label: {
    backgroundColor: '#000',
    color: '#fff',
    padding: 8,
  },

  bigText: {
    fontSize: 30,
  },

  footer: {
    marginBottom: 20,
  },
});