import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Image, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import app from '../../services/firebaseConfig';
import styles from '../../styles/mapa.styles';

const db = getFirestore(app);
const auth = getAuth(app);

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

const OPCOES_TEMPO = [
  { label: '30 Minutos', valor: 30 * 60 * 1000 },
  { label: '1 Hora', valor: 60 * 60 * 1000 },
  { label: '2 Horas', valor: 120 * 60 * 1000 },
];

function corDoTipo(tipo) {
  return TIPOS_ALERTA.find(item => item.label === tipo)?.cor || '#d93025';
}

function emojiDoTipo(tipo) {
  return TIPOS_ALERTA.find(item => item.label === tipo)?.emoji || '📍';
}

function comTimeout(promise, ms = 25000) { 
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo esgotado. Verifique a internet.')), ms)),
  ]);
}

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef(null);

  const [usuario, setUsuario] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);
  const [regiaoInicial, setRegiaoInicial] = useState(REGIAO_PADRAO);
  const [regiaoAtual, setRegiaoAtual] = useState(REGIAO_PADRAO);
  const [alertas, setAlertas] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [modalVisivel, setModalVisivel] = useState(false);
  const [coordenadaSelecionada, setCoordenadaSelecionada] = useState(null);
  const [tipoSelecionado, setTipoSelecionado] = useState('Alagamento');
  const [comentario, setComentario] = useState('');
  const [foto, setFoto] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [tempoSelecionado, setTempoSelecionado] = useState(null); 

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, user => setUsuario(user));
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    const pegarLocalizacao = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: posicao.coords.latitude, longitude: posicao.coords.longitude };
        setLocalizacao(coords);
        setRegiaoInicial({ ...coords, latitudeDelta: 0.012, longitudeDelta: 0.012 });
      } catch (erro) {
        console.error(erro);
      }
    };
     pegarLocalizacao();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'marcacoes'), snapshot => {
      const agora = Date.now();
      const dados = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.expiresAt && item.expiresAt > agora);
      setAlertas(dados);
    });
    return () => unsubscribe();
  }, []);

  const alertasFiltrados = useMemo(() => {
    if (filtroAtivo === 'Todos') return alertas;
    return alertas.filter(item => item.tipo === filtroAtivo);
  }, [alertas, filtroAtivo]);

  const exigirLogin = () => {
    if (!usuario) {
      Alert.alert('Login necessário', 'Você precisa entrar na sua conta para criar marcações.', [
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
    setTempoSelecionado(null);
    setModalVisivel(true);
  };

  const pressionouBotaoAzul = async () => {
    if (!exigirLogin()) return;
    
    setComentario('');
    setFoto(null);
    setTipoSelecionado('Alagamento');
    setTempoSelecionado(null);

    if (localizacao) {
      setCoordenadaSelecionada(localizacao);
      setModalVisivel(true);
    } else {
      setCoordenadaSelecionada({
        latitude: regiaoAtual.latitude,
        longitude: regiaoAtual.longitude
      });
      setModalVisivel(true);
    }
  };

  const tirarFoto = async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.15, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const escolherFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.15, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const salvarMarcacao = async () => {
    if (salvando) return;
    const userAtual = auth.currentUser || usuario;
    const texto = comentario.trim();

    if (!texto) {
      Alert.alert('Aviso', 'Escreva uma breve descrição do problema.');
      return;
    }

    if (!coordenadaSelecionada) {
      Alert.alert('Erro', 'Não foi possível detectar a localização do marcador.');
      return;
    }

    try {
      setSalvando(true);
      const agora = Date.now();

      let duracaoAlerta = 30 * 60 * 1000; 

      if (tempoSelecionado !== null) {
        duracaoAlerta = tempoSelecionado;
      } else {
        duracaoAlerta = foto ? 60 * 60 * 1000 : 30 * 60 * 1000; 
      }

      let fotoUrl = null;
      if (foto) {
        const fotoBase64 = await FileSystem.readAsStringAsync(foto, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fotoUrl = `data:image/jpeg;base64,${fotoBase64}`;
      }

      await comTimeout(addDoc(collection(db, 'marcacoes'), {
        latitude: coordenadaSelecionada.latitude,
        longitude: coordenadaSelecionada.longitude,
        tipo: tipoSelecionado,
        comentario: texto,
        fotoUrl,
        userId: userAtual.uid,
        userName: userAtual.displayName || userAtual.email || 'Usuário',
        createdAt: serverTimestamp(),
        createdAtMillis: agora,
        expiresAt: agora + duracaoAlerta,
      }), 15000);

      setModalVisivel(false);
      Alert.alert('Sucesso', 'Alerta adicionado ao mapa!');
    } catch (erro) {
      console.error("Erro detalhado do Firebase:", erro);
      Alert.alert('Erro ao Salvar', 'Não foi possível salvar o alerta. Verifique a internet e as regras do Firestore.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirPerfil = () => {
    if (!usuario) {
      router.push('/login');
      return;
    }
    router.push('/perfil');
  };

  const iniciais = useMemo(() => {
    const nome = usuario?.displayName || usuario?.email || 'Visitante';
    return nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }, [usuario]);

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
        onDoublePress={abrirModalMarcacao}
        onRegionChangeComplete={setRegiaoAtual}
      >
        {alertasFiltrados.map(item => (
          <Marker key={item.id} coordinate={{ latitude: item.latitude, longitude: item.longitude }} pinColor={corDoTipo(item.tipo)}>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{emojiDoTipo(item.tipo)} {item.tipo}</Text>
                <Text style={styles.calloutText}>{item.comentario}</Text>
                {item.fotoUrl && <Image source={{ uri: item.fotoUrl }} style={styles.calloutImage} />}
                <Text style={styles.calloutFooter}>Por {item.userName}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.searchBox}>
        <TouchableOpacity style={styles.avatar} onPress={abrirPerfil}>
          <Text style={styles.avatarText}>{iniciais}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.searchTitle}>Zona de Risco</Text>
          <Text style={styles.searchSub}>
            {usuario ? 'Pressione + ou dê 2 toques' : 'Modo visitante'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/config')}>
          <Text style={styles.config}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        {TIPOS_ALERTA.map(tipo => (
          <TouchableOpacity key={tipo.label} onPress={() => setFiltroAtivo(tipo.label)} style={[styles.chip, filtroAtivo === tipo.label && { backgroundColor: tipo.cor }]}>
            <Text style={[styles.chipText, filtroAtivo === tipo.label && { color: '#fff' }]}>{tipo.emoji} {tipo.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.locationButton} onPress={() => mapRef.current?.animateToRegion({ ...localizacao, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 700)}>
        <Text style={styles.locationText}>📍</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addButton} onPress={pressionouBotaoAzul}>
        <Text style={styles.addButtonText}>＋</Text>
      </TouchableOpacity>

      <Modal visible={modalVisivel} transparent animationType="slide" onRequestClose={() => setModalVisivel(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisivel(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            
            <View style={styles.dragIndicator} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.modalTitle}>Novo alerta</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)} style={styles.closeButtonMini}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#5f6368' }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.sectionLabel}>Selecione o tipo:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {TIPOS_ALERTA.filter(t => t.label !== 'Todos').map(tipo => (
                <TouchableOpacity key={tipo.label} onPress={() => setTipoSelecionado(tipo.label)} style={[styles.tipoChip, tipoSelecionado === tipo.label && { backgroundColor: tipo.cor }]}>
                  <Text style={[styles.tipoText, tipoSelecionado === tipo.label && { color: '#fff' }]}>{tipo.emoji} {tipo.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Tempo de permanência no mapa:</Text>
            <View style={styles.tempoRow}>
              <TouchableOpacity 
                onPress={() => setTempoSelecionado(null)} 
                style={[styles.tempoChipOpcao, tempoSelecionado === null && styles.tempoChipAtivo]}
              >
                <Text style={[styles.tempoTextoOpcao, tempoSelecionado === null && styles.tempoTextoAtivo]}>
                  ⚡ Automático ({foto ? '1h' : '30min'})
                </Text>
              </TouchableOpacity>
              
              {OPCOES_TEMPO.map(opcao => (
                <TouchableOpacity 
                  key={opcao.label} 
                  onPress={() => setTempoSelecionado(opcao.valor)} 
                  style={[styles.tempoChipOpcao, tempoSelecionado === opcao.valor && styles.tempoChipAtivo]}
                >
                  <Text style={[styles.tempoTextoOpcao, tempoSelecionado === opcao.valor && styles.tempoTextoAtivo]}>
                    {opcao.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Descreva a situação atual deste local..."
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
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={salvarMarcacao} disabled={salvando}>
                <Text style={styles.saveText}>{salvando ? 'Publicando...' : 'Publicar'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}