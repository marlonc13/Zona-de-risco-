import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import app from '../services/firebaseConfig';
import { getAuth, updateProfile, updatePassword, signOut } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 22, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#202124' },
  avatar: { width: 132, height: 132, borderRadius: 66, backgroundColor: '#e8f0fe', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  plus: { fontSize: 34, color: '#1a73e8' },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  secondaryButton: { backgroundColor: '#e8f0fe', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  secondaryText: { color: '#1a73e8', fontWeight: '700' },
  input: { width: '100%', backgroundColor: '#f8fafd', padding: 14, borderRadius: 14, marginBottom: 12, color: '#202124', borderWidth: 1, borderColor: '#e0e0e0' },
  disabled: { color: '#777', backgroundColor: '#f1f3f4' },
  button: { backgroundColor: '#1a73e8', padding: 14, borderRadius: 14, marginTop: 8, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoutButton: { padding: 14, borderRadius: 14, marginTop: 12, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#d93025' },
  logoutText: { color: '#d93025', fontWeight: 'bold' },
});
