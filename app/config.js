import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteUser } from 'firebase/auth';
import { router } from 'expo-router';
import { auth } from '../services/firebaseConfig';
import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import styles from '../styles/config.styles';

export default function Config() {
  const { activeTheme, toggleTheme } = useTheme();
  const temaAtual = activeTheme || 'light';
  const cores = Colors[temaAtual] || Colors.light;

  const [isDark, setIsDark] = useState(temaAtual === 'dark');
  const [letraGrande, setLetraGrande] = useState(false);
  const [tamanhoFonte, setTamanhoFonte] = useState(16);
  const [excluindoConta, setExcluindoConta] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  useEffect(() => {
    setIsDark(temaAtual === 'dark');
  }, [temaAtual]);

  const carregarConfiguracoes = async () => {
    const letraSalva = await AsyncStorage.getItem('letraGrande');

    if (letraSalva === 'true') {
      setLetraGrande(true);
      setTamanhoFonte(22);
    } else {
      setLetraGrande(false);
      setTamanhoFonte(16);
    }
  };

  const mudarTema = async (value) => {
    const novoTema = value ? 'dark' : 'light';
    setIsDark(value);
    await toggleTheme(novoTema);
  };

  const mudarTamanhoLetra = async () => {
    const novoEstado = !letraGrande;
    setLetraGrande(novoEstado);
    setTamanhoFonte(novoEstado ? 22 : 16);
    await AsyncStorage.setItem('letraGrande', String(novoEstado));
  };

  const confirmarExclusaoConta = () => {
    Alert.alert(
      'Excluir conta',
      'Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: excluirConta },
      ]
    );
  };

  const excluirConta = async () => {
    try {
      setExcluindoConta(true);

      const usuarioAtual = auth.currentUser;

      if (!usuarioAtual) {
        Alert.alert('Erro', 'Nenhum usuário logado foi encontrado.');
        return;
      }

      await deleteUser(usuarioAtual);
      await AsyncStorage.clear();

      Alert.alert('Conta excluída', 'Sua conta foi excluída com sucesso.');
      router.replace('/');
    } catch (error) {
      console.log('Erro ao excluir conta:', error);

      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Login recente necessário',
          'Por segurança, faça login novamente e tente excluir a conta logo em seguida.'
        );
      } else {
        Alert.alert('Erro', 'Não foi possível excluir sua conta agora. Tente novamente.');
      }
    } finally {
      setExcluindoConta(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: cores.background }]}> 
      <Text style={styles.icon}>⚙️</Text>
      <Text style={[styles.title, { color: cores.text }]}>Configurações</Text>

      <View style={styles.optionsContainer}>
        <View style={[styles.optionCard, { backgroundColor: cores.card }]}> 
          <View style={styles.optionTextArea}>
            <Text style={[styles.label, { color: cores.text, fontSize: tamanhoFonte }]}>Modo escuro</Text>
            <Text style={[styles.description, { color: cores.text }]}>Altera a aparência do aplicativo.</Text>
          </View>
          <Switch value={isDark} onValueChange={mudarTema} />
        </View>

        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: cores.card }]}
          onPress={mudarTamanhoLetra}
        >
          <View style={styles.optionTextArea}>
            <Text style={[styles.label, { color: cores.text, fontSize: tamanhoFonte }]}>Letras grandes</Text>
            <Text style={[styles.description, { color: cores.text }]}>Aumenta o tamanho do texto desta tela.</Text>
          </View>
          <Text style={[styles.bigText, { color: letraGrande ? '#1a73e8' : cores.text }]}>Aa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteButton, excluindoConta && styles.disabledButton]}
          onPress={confirmarExclusaoConta}
          disabled={excluindoConta}
        >
          <Text style={styles.deleteButtonText}>
            {excluindoConta ? 'Excluindo...' : 'Excluir conta'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
