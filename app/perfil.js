import { View, Text, TextInput, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import app from '../services/firebaseConfig';
import { EmailAuthProvider, getAuth, onAuthStateChanged, reauthenticateWithCredential, signOut, updatePassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import styles from '../styles/perfil.styles';
import { observarStatusAdministrador } from '../services/accessControl';
import { uploadImage } from '../services/imageUpload';

const auth = getAuth(app);
const db = getFirestore(app);
export default function Perfil() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  const [foto, setFoto] = useState(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [administrador, setAdministrador] = useState(false);

  useEffect(() => {
    let pararAdmin = () => {};
    const pararAuth = onAuthStateChanged(auth, user => {
      pararAdmin();
      pararAdmin = observarStatusAdministrador(user, setAdministrador);
    });
    return () => { pararAuth(); pararAdmin(); };
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/email-login');
      return;
    }
    setNome(user.displayName || '');
    setEmail(user.email || '');
    setFoto(user.photoURL || null);
    getDoc(doc(db, 'usuarios', user.uid))
      .then(snapshot => {
        if (snapshot.exists() && snapshot.data()?.photoUrl) {
          setFoto(snapshot.data().photoUrl);
        }
      })
      .catch(error => console.warn('Não foi possível carregar a foto do perfil:', error));
  }, [router]);

  const escolherFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso às fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync
    ({ mediaTypes: ['images'],
      quality: 0.2, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const tirarFoto = async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.2, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const salvarPerfil = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setSalvandoPerfil(true);
      let photoUrl = foto;

      if (foto && !foto.startsWith('http') && !foto.startsWith('data:')) {
        photoUrl = await uploadImage(foto);
      }

      const nomeFinal = nome.trim() || 'Usuário';
      await updateProfile(user, { displayName: nomeFinal });
      await setDoc(doc(db, 'usuarios', user.uid), {
        nome: nomeFinal,
        email: user.email,
        photoUrl: photoUrl || null,
        atualizadoEm: serverTimestamp(),
      }, { merge: true });
      setFoto(photoUrl || null);
      Alert.alert('Sucesso', 'Nome e foto atualizados.');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      let mensagem = `Não foi possível salvar a foto. Código: ${error.code || 'desconhecido'}.`;
      if (error.code === 'permission-denied') mensagem = 'O Firebase bloqueou a atualização do perfil. Confira as regras da coleção usuarios.';
      Alert.alert('Erro', mensagem);
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const alterarSenha = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!senhaAtual || !novaSenha || !confirmarSenha) return Alert.alert('Campos obrigatórios', 'Preencha a senha atual, a nova senha e a confirmação.');
    if (novaSenha.length < 6) return Alert.alert('Senha fraca', 'A nova senha precisa ter pelo menos 6 caracteres.');
    if (novaSenha !== confirmarSenha) return Alert.alert('Senhas diferentes', 'A confirmação precisa ser igual à nova senha.');

    try {
      setSalvandoSenha(true);
      const credencial = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, credencial);
      await updatePassword(user, novaSenha);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setMostrarSenhas(false);
      Alert.alert('Senha alterada', 'Sua senha foi atualizada com sucesso.');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      let mensagem = `Não foi possível alterar a senha. Código: ${error.code || 'desconhecido'}.`;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') mensagem = 'A senha atual está incorreta.';
      if (error.code === 'auth/weak-password') mensagem = 'A nova senha precisa ter pelo menos 6 caracteres.';
      Alert.alert('Erro', mensagem);
    } finally {
      setSalvandoSenha(false);
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
      <Text style={{ color: administrador ? '#d93025' : '#5f6368', fontWeight: '800', marginBottom: 12 }}>
        Perfil: {administrador ? 'Administrador' : 'Usuário'}
      </Text>
      <TouchableOpacity style={styles.button} onPress={salvarPerfil} disabled={salvandoPerfil}>
        <Text style={styles.buttonText}>{salvandoPerfil ? 'Salvando perfil...' : 'Salvar nome e foto'}</Text>
      </TouchableOpacity>

      <Text style={styles.passwordTitle}>Alterar senha (opcional)</Text>
      <View style={styles.passwordBox}><TextInput style={styles.passwordInput} placeholder="Senha atual" secureTextEntry={!mostrarSenhas} value={senhaAtual} onChangeText={setSenhaAtual} /><TouchableOpacity style={styles.eyeButton} onPress={() => setMostrarSenhas(atual => !atual)}><Text style={styles.eyeText}>{mostrarSenhas ? '🙈' : '👁️'}</Text></TouchableOpacity></View>
      <TextInput style={styles.input} placeholder="Nova senha" secureTextEntry={!mostrarSenhas} value={novaSenha} onChangeText={setNovaSenha} />
      <TextInput style={styles.input} placeholder="Confirmar nova senha" secureTextEntry={!mostrarSenhas} value={confirmarSenha} onChangeText={setConfirmarSenha} />

      <TouchableOpacity style={styles.passwordButton} onPress={alterarSenha} disabled={salvandoSenha}>
        <Text style={styles.passwordButtonText}>{salvandoSenha ? 'Alterando senha...' : 'Alterar senha'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/endereco')}>
        <Text style={styles.secondaryText}>🏠 Adicionar ou mudar endereço</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={sair}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
