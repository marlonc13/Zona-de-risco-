import { View, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, TextInput } from '../components/texto';
import ScreenWrapper from '../components/screen-wrapper';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import app from '../services/firebaseConfig';
import { getAuth, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import estilosPerfil from '../styles/perfil.styles';
import { uploadImage } from '../services/imageUpload';
import CameraCaptura from '../components/camera-captura';
import ModalDeslizante from '../components/modal-deslizante';
import { useEstilos, useTema } from '../hooks/use-tema';

const auth = getAuth(app);
const db = getFirestore(app);

export default function Perfil() {
  const router = useRouter();
  const styles = useEstilos(estilosPerfil);
  const { cores } = useTema();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoSalva, setFotoSalva] = useState(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [cameraVisivel, setCameraVisivel] = useState(false);
  const [opcoesFotoVisiveis, setOpcoesFotoVisiveis] = useState(false);
  // o que abrir depois que o painel de opções da foto terminar de fechar
  const acaoFotoPendente = useRef(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/email-login');
      return;
    }
    setNome(user.displayName || '');
    setEmail(user.email || '');
    setFoto(user.photoURL || null);
    setFotoSalva(user.photoURL || null);
    getDoc(doc(db, 'usuarios', user.uid))
      .then(snapshot => {
        const photoUrl = snapshot.exists() ? snapshot.data()?.photoUrl : null;
        if (photoUrl) {
          setFoto(photoUrl);
          setFotoSalva(photoUrl);
        }
      })
      .catch(error => console.warn('Não foi possível carregar a foto:', error));
  }, [router]);

  const escolherFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso às fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const escolherOpcaoFoto = acao => {
    acaoFotoPendente.current = acao;
    setOpcoesFotoVisiveis(false);
  };

  const abrirAcaoFotoPendente = () => {
    const acao = acaoFotoPendente.current;
    acaoFotoPendente.current = null;
    if (acao === 'camera') setCameraVisivel(true);
    if (acao === 'galeria') escolherFoto();
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

      const nomeFinal = (nome || '').trim() || 'Usuário';
      await updateProfile(user, { displayName: nomeFinal });
      await setDoc(doc(db, 'usuarios', user.uid), {
        nome: nomeFinal,
        email: user.email,
        photoUrl: photoUrl || null,
        atualizadoEm: serverTimestamp(),
      }, { merge: true });
      setFoto(photoUrl || null);
      setFotoSalva(photoUrl || null);
      Alert.alert('Sucesso', 'Nome e foto atualizados.');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      let mensagem = `Não foi possível salvar a foto. Código: ${error.code || 'desconhecido'}.`;
      if (error.code === 'permission-denied') mensagem = 'O Firebase bloqueou a atualização do perfil.';
      Alert.alert('Erro', mensagem);
    } finally {
      setSalvandoPerfil(false);
    }
  };

  // Volta para a tela inicial (entrar como visitante ou fazer login) e limpa o histórico,
  // para o botão "voltar" não reabrir telas da conta que acabou de sair
  const sair = async () => {
    await signOut(auth);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/inicio');
  };

  const fotoNaoSalva = foto !== fotoSalva;

  const OPCOES_MENU = [
    { icone: 'star', cor: '#f9ab00', rotulo: 'Pessoas e locais favoritos', descricao: 'Acompanhe alertas perto de quem você ama', onPress: () => router.push('/familiares') },
    { icone: 'settings-sharp', cor: '#5f6368', rotulo: 'Configurações', descricao: 'Tema, letras grandes, senha e residência', onPress: () => router.push('/config') },
  ];

  return (
    <ScreenWrapper scrollable style={styles.container} includeTop={false} backgroundColor={cores.screen}>
      {/* Cabeçalho: foto, nome e e-mail */}
      <View style={styles.headerCard}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setOpcoesFotoVisiveis(true)}
          accessibilityRole="button"
          accessibilityLabel="Alterar foto de perfil"
        >
          <View style={styles.avatar}>
            {foto
              ? <Image source={{ uri: foto }} style={styles.avatarImage} />
              : <Ionicons name="person" size={58} color={cores.tint} />}
          </View>
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={16} color={cores.onButton} />
          </View>
        </TouchableOpacity>

        <Text style={styles.name} numberOfLines={2}>{nome.trim() || 'Seu nome'}</Text>
        <Text style={styles.email} numberOfLines={1}>{email}</Text>
        {fotoNaoSalva && <Text style={styles.unsavedHint}>Toque em “Salvar alterações” para manter a nova foto.</Text>}
      </View>

      {/* Dados da conta */}
      <Text style={styles.sectionTitle}>Dados da conta</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Nome</Text>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={18} color={cores.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Como você quer ser chamado"
            placeholderTextColor={cores.placeholder}
            value={nome}
            onChangeText={setNome}
          />
        </View>

        <Text style={[styles.label, styles.labelSpacing]}>E-mail</Text>
        <View style={[styles.inputRow, styles.inputRowDisabled]}>
          <Ionicons name="mail-outline" size={18} color={cores.textMuted} />
          <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />
          <Ionicons name="lock-closed" size={14} color={cores.textFaint} />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, salvandoPerfil && styles.disabledButton]}
          onPress={salvarPerfil}
          disabled={salvandoPerfil}
        >
          <Text style={styles.saveButtonText}>{salvandoPerfil ? 'Salvando...' : 'Salvar alterações'}</Text>
        </TouchableOpacity>
      </View>

      {/* Atalhos */}
      <Text style={styles.sectionTitle}>Mais opções</Text>
      <View style={[styles.card, styles.menuCard]}>
        {OPCOES_MENU.map((opcao, indice) => (
          <TouchableOpacity
            key={opcao.rotulo}
            activeOpacity={0.7}
            style={[styles.menuRow, indice > 0 && styles.menuRowDivider]}
            onPress={opcao.onPress}
          >
            <View style={[styles.menuIcon, { backgroundColor: opcao.cor }]}>
              <Ionicons name={opcao.icone} size={18} color="#fff" />
            </View>
            <View style={styles.menuTextArea}>
              <Text style={styles.menuLabel}>{opcao.rotulo}</Text>
              <Text style={styles.menuDescription}>{opcao.descricao}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={cores.textFaint} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={sair}>
        <Ionicons name="log-out-outline" size={20} color={cores.danger} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      {/* Opções ao tocar na foto */}
      <ModalDeslizante
        visivel={opcoesFotoVisiveis}
        onFechar={() => setOpcoesFotoVisiveis(false)}
        aoTerminarDeFechar={abrirAcaoFotoPendente}
        estiloFundo={styles.sheetOverlay}
        estiloPainel={styles.sheet}
      >
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Foto de perfil</Text>

        <TouchableOpacity style={styles.sheetOption} onPress={() => escolherOpcaoFoto('camera')}>
          <View style={[styles.sheetOptionIcon, { backgroundColor: cores.tintBackground }]}>
            <Ionicons name="camera" size={22} color={cores.tint} />
          </View>
          <Text style={styles.sheetOptionText}>Tirar foto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sheetOption} onPress={() => escolherOpcaoFoto('galeria')}>
          <View style={[styles.sheetOptionIcon, { backgroundColor: cores.tintBackground }]}>
            <Ionicons name="images" size={22} color={cores.tint} />
          </View>
          <Text style={styles.sheetOptionText}>Galeria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sheetCancel} onPress={() => setOpcoesFotoVisiveis(false)}>
          <Text style={styles.sheetCancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ModalDeslizante>

      <CameraCaptura
        visivel={cameraVisivel}
        cameraInicial="front"
        onFechar={() => setCameraVisivel(false)}
        onFotoTirada={setFoto}
      />
    </ScreenWrapper>
  );
}
