import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';

export default function Config() {
  const [tema, setTema] = useState('light');
  const [isDark, setIsDark] = useState(false);
  
  // MODIFICADO: Estados para controlar o tamanho da letra
  const [letraGrande, setLetraGrande] = useState(false);
  const [tamanhoFonte, setTamanhoFonte] = useState(16); // Tamanho padrão padrão

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    // Carrega o Tema
    const temaSalvo = await AsyncStorage.getItem('tema');
    if (temaSalvo) {
      setTema(temaSalvo);
      setIsDark(temaSalvo === 'dark');
    }

    // MODIFICADO: Carrega o tamanho da letra salvo
    const letraSalva = await AsyncStorage.getItem('letraGrande');
    if (letraSalva === 'true') {
      setLetraGrande(true);
      setTamanhoFonte(22); // Tamanho maior
    } else {
      setLetraGrande(false);
      setTamanhoFonte(16); // Tamanho normal
    }
  };

  const mudarTema = async (value) => {
    const novoTema = value ? 'dark' : 'light';
    setIsDark(value);
    setTema(novoTema);
    await AsyncStorage.setItem('tema', novoTema);
  };

  // MODIFICADO: Função para alternar o tamanho da letra ao clicar
  const mudarTamanhoLetra = async () => {
    const novoEstado = !letraGrande;
    setLetraGrande(novoEstado);
    
    const novoTamanho = novoEstado ? 22 : 16;
    setTamanhoFonte(novoTamanho);

    // Salva a preferência do usuário
    await AsyncStorage.setItem('letraGrande', String(novoEstado));
  };

  const abrirIdioma = () => {
    alert('Tela de idioma (vamos fazer depois)');
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[tema].background }]}>
      <Text style={styles.icon}>⚙️</Text>

      <View style={styles.row}>
        <View style={styles.option}>
          {/* Aplicando o tamanho da fonte dinamicamente */}
          <Text style={[styles.label, { fontSize: tamanhoFonte }]}>Tema</Text>
          <Switch value={isDark} onValueChange={mudarTema} />
        </View>

        <TouchableOpacity style={styles.option} onPress={abrirIdioma}>
          <Text style={[styles.label, { fontSize: tamanhoFonte }]}>Idioma</Text>
          <Text style={styles.icon}>🌐</Text>
        </TouchableOpacity>

        {/* MODIFICADO: Agora este botão ativa a função de mudar o tamanho */}
        <TouchableOpacity style={styles.option} onPress={mudarTamanhoLetra}>
          <Text style={[styles.label, { fontSize: tamanhoFonte }]}>Letras</Text>
          {/* Destaca visualmente se a letra grande está ativa ou não */}
          <Text style={[styles.bigText, { color: letraGrande ? '#1a73e8' : '#000' }]}>Aa</Text>
        </TouchableOpacity>
      </View>
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
    borderRadius: 6, // Um cantinho arredondado para ficar mais bonito
  },
  bigText: {
    fontSize: 30,
    fontWeight: 'bold',
  },
});