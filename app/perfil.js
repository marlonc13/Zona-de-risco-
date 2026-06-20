import { View, Text, TextInput, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import app from '../services/firebaseConfig';
import { getAuth, updateProfile, updatePassword, signOut } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styles from '../styles/perfil.styles';

const auth = getAuth(app);
const storage = getStorage(app);

async function uriParaBlob(uri) {
  const response = await fetch(uri);
  return await response.blob();
}

export default function Perfil() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [foto, setFoto] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }
    setNome(user.displayName || '');
    setEmail(user.email || '');
    setFoto(user.photoURL || null);
  }, []);

  const escolherFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso às fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync
    ({ mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const tirarFoto = async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const salvar = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setSalvando(true);
      let photoURL = user.photoURL;

      if (foto && foto !== user.photoURL) {
        const blob = await uriParaBlob(foto);
        const storageRef = ref(storage, `usuarios/${user.uid}/perfil.jpg`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
      }

      await updateProfile(user, { displayName: nome.trim() || 'Usuário', photoURL });

      if (senha.trim().length > 0) {
        if (senha.trim().length < 6) {
          Alert.alert('Senha fraca', 'A senha precisa ter pelo menos 6 caracteres.');
          return;
        }
        await updatePassword(user, senha.trim());
        setSenha('');
      }

      Alert.alert('Sucesso', 'Perfil atualizado.');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Não consegui atualizar. Para trocar senha, talvez seja necessário fazer login novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const sair = async () => {
    await signOut(auth);
    router.replace('/mapa');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <TouchableOpacity onPress={escolherFoto} style={styles.avatar}>
        {foto ? <Image source={{ uri: foto }} style={styles.avatarImage} /> : <Text style={styles.plus}>+</Text>}
      </TouchableOpacity>

      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={tirarFoto}><Text style={styles.secondaryText}>📷 Tirar foto</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={escolherFoto}><Text style={styles.secondaryText}>🖼️ Galeria</Text></TouchableOpacity>
      </View>

      <TextInput style={styles.input} placeholder="Nome" value={nome} onChangeText={setNome} />
      <TextInput style={[styles.input, styles.disabled]} placeholder="Email" value={email} editable={false} />
      <TextInput style={styles.input} placeholder="Nova senha (opcional)" secureTextEntry value={senha} onChangeText={setSenha} />

      <TouchableOpacity style={styles.button} onPress={salvar} disabled={salvando}>
        <Text style={styles.buttonText}>{salvando ? 'Salvando...' : 'Salvar alterações'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={sair}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
