import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { authenticateWithBiometrics } from '../services/biometricAuth';

export default function Perfil() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [foto, setFoto] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const nomeSalvo = await AsyncStorage.getItem('nome');
    const emailSalvo = await AsyncStorage.getItem('email');
    const fotoSalva = await AsyncStorage.getItem('foto');

    if (nomeSalvo) setNome(nomeSalvo);
    if (emailSalvo) setEmail(emailSalvo);
    if (fotoSalva) setFoto(fotoSalva);
  };

  const escolherFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setFoto(uri);
      await AsyncStorage.setItem('foto', uri);
    }
  };

  const salvar = async () => {
    await AsyncStorage.setItem('nome', nome);
    await AsyncStorage.setItem('email', email);

    Alert.alert('Sucesso', 'Dados salvos!');
  };

  const trocarSenha = async () => {
    const result = await authenticateWithBiometrics();

    if (!result.success) {
      Alert.alert('Erro', 'Autenticação necessária');
      return;
    }

    await AsyncStorage.setItem('senha', senha);
    Alert.alert('Sucesso', 'Senha atualizada!');
  };

  return (
    <View style={styles.container}>

      <TouchableOpacity onPress={escolherFoto} style={styles.avatar}>
        {foto ? (
          <Image source={{ uri: foto }} style={styles.avatarImage} />
        ) : (
          <Text style={{ fontSize: 20 }}>+</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.title}>USUARIO</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TouchableOpacity style={styles.button} onPress={trocarSenha}>
        <Text style={styles.buttonText}>Trocar Senha</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={salvar}>
        <Text style={styles.buttonText}>Salvar</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    justifyContent: 'center',
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },

  title: {
    fontSize: 22,
    marginBottom: 20,
  },

  input: {
    width: '100%',
    backgroundColor: '#777',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    color: '#fff',
  },

  button: {
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
  },
});