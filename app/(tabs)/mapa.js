import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Image, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import app from '../../services/firebaseConfig';

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const TRINTA_MINUTOS = 30 * 60 * 1000;
const UMA_HORA = 60 * 60 * 1000;

const REGIAO_PADRAO = {
  latitude: -22.47,
  longitude: -43.82,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const TIPOS_ALERTA = [
  { label: 'Todos', emoji: '🗺️', cor: '#1a73e8' },
  { label: 'Alagamento', emoji: '🌊', cor: '#1a73e8' },
  { label: 'Deslizamento', emoji: '⛰️', cor: '#e8710a' },
  { label: 'Bloqueio', emoji: '🚧', cor: '#fbbc04' },
  { label: 'Acidente', emoji: '⚠️', cor: '#d93025' },
  { label: 'Outro', emoji: '📍', cor: '#5f6368' },
];

function corDoTipo(tipo) {
  return TIPOS_ALERTA.find(item => item.label === tipo)?.cor || '#d93025';
}

function emojiDoTipo(tipo) {
  return TIPOS_ALERTA.find(item => item.label === tipo)?.emoji || '📍';
}

async function uriParaBlob(uri) {
  const response = await fetch(uri);
  return await response.blob();
}

function comTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo esgotado ao salvar. Verifique internet/Firebase.')), ms)),
  ]);
}

const TEMPO_ENTRE_ALERTAS = 2 * 60 * 1000;
const JANELA_SPAM = 30 * 60 * 1000;
const LIMITE_ALERTAS_JANELA = 5;

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef(null);
  const alertasConhecidos = useRef(new Set());

  const [usuario, setUsuario] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);
  const [regiaoInicial, setRegiaoInicial] = useState(REGIAO_PADRAO);
  const [alertas, setAlertas] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [modalVisivel, setModalVisivel] = useState(false);
  const [coordenadaSelecionada, setCoordenadaSelecionada] = useState(null);
  const [tipoSelecionado, setTipoSelecionado] = useState('Alagamento');
  const [comentario, setComentario] = useState('');
  const [foto, setFoto] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const iniciais = useMemo(() => {
    const nome = usuario?.displayName || usuario?.email || 'Visitante';
    return nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }, [usuario]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, user => setUsuario(user));
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    const pegarLocalizacao = async () => {
      try {
        const servicosAtivos = await Location.hasServicesEnabledAsync();
        if (!servicosAtivos) {
          Alert.alert('Localização desligada', 'Ative o GPS/localização do celular.');
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão negada', 'Você ainda consegue ver alertas, mas sua posição não aparecerá no mapa.');
          return;
        }

        const posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const coords = {
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
        };

        setLocalizacao(coords);
        const novaRegiao = { ...coords, latitudeDelta: 0.012, longitudeDelta: 0.012 };
        setRegiaoInicial(novaRegiao);
        mapRef.current?.animateToRegion(novaRegiao, 700);
      } catch (erro) {
        console.error('Erro ao buscar localização:', erro);
      }
    };

    pegarLocalizacao();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'marcacoes'), async snapshot => {
      const agora = Date.now();
      const dados = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.expiresAt && item.expiresAt > agora)
        .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));

      const idsAnteriores = alertasConhecidos.current;
      const novos = dados.filter(item => !idsAnteriores.has(item.id));
      dados.forEach(item => idsAnteriores.add(item.id));
      setAlertas(dados);

      if (novos.length > 0 && idsAnteriores.size > novos.length && Platform.OS !== 'web') {
        const alerta = novos[0];
        Alert.alert(
          `${emojiDoTipo(alerta.tipo)} Novo alerta de ${alerta.tipo || 'risco'}`,
          alerta.comentario || 'Um usuário marcou um novo ponto no mapa.'
        );
      }
    }, erro => {
      console.error('Erro ao carregar alertas:', erro);
      Alert.alert('Erro no Firebase', 'Não consegui carregar os alertas. Verifique internet e regras do Firestore.');
    });

    const intervalo = setInterval(() => {
      const agora = Date.now();
      setAlertas(lista => lista.filter(item => item.expiresAt && item.expiresAt > agora));
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(intervalo);
    };
  }, []);

  const alertasFiltrados = useMemo(() => {
    if (filtroAtivo === 'Todos') return alertas;
    return alertas.filter(item => item.tipo === filtroAtivo);
  }, [alertas, filtroAtivo]);

  const exigirLogin = () => {
    if (!usuario) {
      Alert.alert('Login necessário', 'Você pode ver os alertas sem login, mas precisa entrar com Google ou e-mail/senha para criar alertas.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Entrar', onPress: () => router.push('/login') },
      ]);
      return false;
    }
    return true;
  };

  const abrirModalMarcacao = evento => {
    if (!exigirLogin()) return;
    setCoordenadaSelecionada(evento.nativeEvent.coordinate);
    setComentario('');
    setFoto(null);
    setTipoSelecionado('Alagamento');
    setModalVisivel(true);
  };

  const tirarFoto = async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à câmera para tirar foto do alerta.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setFoto(result.assets[0].uri);
    }
  };

  const escolherFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Permita acesso à galeria para anexar uma foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setFoto(result.assets[0].uri);
    }
  };

  const salvarMarcacao = async () => {
    if (salvando) return;

    const userAtual = auth.currentUser || usuario;
    const texto = comentario.trim();

    if (!userAtual) {
      Alert.alert('Login necessário', 'Visitantes podem ver alertas, mas não podem publicar. Entre com e-mail/senha para marcar no mapa.');
      setModalVisivel(false);
      router.push('/login');
      return;
    }

    if (!texto) {
      Alert.alert('Comentário vazio', 'Escreva o que está acontecendo nesse local.');
      return;
    }

    if (!coordenadaSelecionada) {
      Alert.alert('Local não selecionado', 'Segure no mapa para escolher onde está o alerta.');
      return;
    }

    try {
      setSalvando(true);

      const agora = Date.now();
      const historicoTexto = await AsyncStorage.getItem(`alertasHistorico:${userAtual.uid}`);
      const historico = historicoTexto ? JSON.parse(historicoTexto) : [];
      const recentes = historico.filter(t => agora - t < JANELA_SPAM);
      const ultimo = recentes[recentes.length - 1];

      if (ultimo && agora - ultimo < TEMPO_ENTRE_ALERTAS) {
        const segundos = Math.ceil((TEMPO_ENTRE_ALERTAS - (agora - ultimo)) / 1000);
        Alert.alert('Calma aí', `Para evitar spam, espere ${segundos}s antes de criar outro alerta.`);
        setSalvando(false);
        return;
      }

      if (recentes.length >= LIMITE_ALERTAS_JANELA) {
        Alert.alert('Limite temporário', 'Para evitar spam, cada conta pode criar no máximo 5 alertas a cada 30 minutos.');
        setSalvando(false);
        return;
      }

      let fotoUrl = null;
      const criadoEm = agora;
      const duracao = foto ? UMA_HORA : TRINTA_MINUTOS;

      if (foto) {
        const blob = await uriParaBlob(foto);
        const caminho = `alertas/${userAtual.uid}/${criadoEm}.jpg`;
        const storageRef = ref(storage, caminho);
        await comTimeout(uploadBytes(storageRef, blob), 20000);
        fotoUrl = await comTimeout(getDownloadURL(storageRef), 10000);
      }

      await comTimeout(addDoc(collection(db, 'marcacoes'), {
        latitude: coordenadaSelecionada.latitude,
        longitude: coordenadaSelecionada.longitude,
        tipo: tipoSelecionado,
        comentario: texto,
        fotoUrl,
        userId: userAtual.uid,
        userName: userAtual.displayName || userAtual.email || 'Usuário',
        userPhoto: userAtual.photoURL || null,
        createdAt: serverTimestamp(),
        createdAtMillis: criadoEm,
        expiresAt: criadoEm + duracao,
      }), 15000);

      await AsyncStorage.setItem(`alertasHistorico:${userAtual.uid}`, JSON.stringify([...recentes, criadoEm]));

      setModalVisivel(false);
      setComentario('');
      setFoto(null);
      setCoordenadaSelecionada(null);
      Alert.alert('Alerta publicado', 'Seu alerta já aparece no mapa para outros usuários.');
    } catch (erro) {
      console.error('Erro ao salvar alerta:', erro);
      Alert.alert('Erro ao salvar', erro?.message || 'Não consegui salvar o alerta. Verifique Firebase Firestore/Storage e a internet.');
    } finally {
      setSalvando(false);
    }
  };

  const centralizarNaMinhaLocalizacao = () => {
    if (!localizacao) {
      Alert.alert('Localização não encontrada', 'Ative o GPS e permita localização.');
      return;
    }
    mapRef.current?.animateToRegion({ ...localizacao, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 700);
  };

  const abrirPerfil = () => {
    if (!usuario) {
      router.push('/login');
      return;
    }
    router.push('/perfil');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={regiaoInicial}
        onLongPress={abrirModalMarcacao}
        toolbarEnabled={false}
      >
        {alertasFiltrados.map(item => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            pinColor={corDoTipo(item.tipo)}
          >
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{emojiDoTipo(item.tipo)} {item.tipo}</Text>
                <Text style={styles.calloutText}>{item.comentario}</Text>
                {item.fotoUrl && <Image source={{ uri: item.fotoUrl }} style={styles.calloutImage} />}
                <Text style={styles.calloutFooter}>Por {item.userName || 'Usuário'} • temporário</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.searchBox}>
        <TouchableOpacity style={styles.avatar} onPress={abrirPerfil}>
          {usuario?.photoURL ? <Image source={{ uri: usuario.photoURL }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{iniciais}</Text>}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.searchTitle}>Zona de Risco</Text>
          <Text style={styles.searchSub}>{usuario ? 'Segure no mapa para criar alerta' : 'Modo visitante: visualização liberada'}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/config')}>
          <Text style={styles.config}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ paddingRight: 20 }}>
        {TIPOS_ALERTA.map(tipo => (
          <TouchableOpacity
            key={tipo.label}
            onPress={() => setFiltroAtivo(tipo.label)}
            style={[styles.chip, filtroAtivo === tipo.label && { backgroundColor: tipo.cor }]}
          >
            <Text style={[styles.chipText, filtroAtivo === tipo.label && { color: '#fff' }]}>{tipo.emoji} {tipo.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.locationButton} onPress={centralizarNaMinhaLocalizacao}>
        <Text style={styles.locationText}>📍</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addButton} onPress={() => {
        if (!exigirLogin()) return;
        if (!localizacao) {
          Alert.alert('Escolha no mapa', 'Segure em um ponto do mapa para criar um alerta exatamente naquele lugar.');
          return;
        }
        setCoordenadaSelecionada(localizacao);
        setModalVisivel(true);
      }}>
        <Text style={styles.addButtonText}>＋</Text>
      </TouchableOpacity>

      <Modal visible={modalVisivel} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Novo alerta</Text>
            <Text style={styles.modalInfo}>Sem foto: 30 min • Com foto: 1 hora</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {TIPOS_ALERTA.filter(t => t.label !== 'Todos').map(tipo => (
                <TouchableOpacity
                  key={tipo.label}
                  onPress={() => setTipoSelecionado(tipo.label)}
                  style={[styles.tipoChip, tipoSelecionado === tipo.label && { backgroundColor: tipo.cor }]}
                >
                  <Text style={[styles.tipoText, tipoSelecionado === tipo.label && { color: '#fff' }]}>{tipo.emoji} {tipo.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="Ex: alagamento nessa rua, poste caído, bloqueio..."
              placeholderTextColor="#777"
              value={comentario}
              onChangeText={setComentario}
              multiline
            />

            {foto && <Image source={{ uri: foto }} style={styles.preview} />}

            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoButton} onPress={tirarFoto}>
                <Text style={styles.photoText}>📷 Tirar foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={escolherFoto}>
                <Text style={styles.photoText}>🖼️ Galeria</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisivel(false)} disabled={salvando}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton, salvando && styles.saveButtonDisabled]} onPress={salvarMarcacao} disabled={salvando}>
                <Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Publicar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  searchBox: {
    position: 'absolute', top: 48, left: 14, right: 14, backgroundColor: '#fff', borderRadius: 28,
    paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
    elevation: 7, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 8,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#e8f0fe', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  avatarText: { color: '#1a73e8', fontWeight: 'bold' },
  searchTitle: { fontSize: 16, fontWeight: '700', color: '#202124' },
  searchSub: { fontSize: 12, color: '#5f6368', marginTop: 1 },
  config: { fontSize: 22 },
  filterBar: { position: 'absolute', top: 112, left: 14, right: 0 },
  chip: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, marginRight: 8, elevation: 4 },
  chipText: { color: '#202124', fontWeight: '600' },
  locationButton: {
    position: 'absolute', right: 18, bottom: 112, width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 7,
  },
  locationText: { fontSize: 22 },
  addButton: {
    position: 'absolute', right: 18, bottom: 42, width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#1a73e8', alignItems: 'center', justifyContent: 'center', elevation: 8,
  },
  addButtonText: { color: '#fff', fontSize: 34, marginTop: -2 },
  callout: { width: 230, backgroundColor: '#fff', borderRadius: 14, padding: 12, elevation: 8 },
  calloutTitle: { fontSize: 16, fontWeight: 'bold', color: '#202124', marginBottom: 4 },
  calloutText: { fontSize: 14, color: '#3c4043', marginBottom: 8 },
  calloutImage: { width: '100%', height: 125, borderRadius: 10, marginBottom: 8 },
  calloutFooter: { fontSize: 11, color: '#5f6368' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 21, fontWeight: 'bold', color: '#202124' },
  modalInfo: { color: '#5f6368', marginTop: 4, marginBottom: 14 },
  tipoChip: { backgroundColor: '#f1f3f4', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, marginRight: 8 },
  tipoText: { fontWeight: '600', color: '#202124' },
  input: { minHeight: 85, backgroundColor: '#f8fafd', borderRadius: 14, padding: 12, color: '#202124', textAlignVertical: 'top', borderWidth: 1, borderColor: '#e0e0e0' },
  preview: { width: '100%', height: 170, borderRadius: 14, marginTop: 12 },
  photoRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  photoButton: { flex: 1, backgroundColor: '#e8f0fe', padding: 12, borderRadius: 12, alignItems: 'center' },
  photoText: { color: '#1a73e8', fontWeight: '700' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  cancelButton: { backgroundColor: '#f1f3f4' },
  saveButton: { backgroundColor: '#1a73e8' },
  saveButtonDisabled: { backgroundColor: '#8ab4f8' },
  cancelText: { color: '#202124', fontWeight: '700' },
  saveText: { color: '#fff', fontWeight: '700' },
});
