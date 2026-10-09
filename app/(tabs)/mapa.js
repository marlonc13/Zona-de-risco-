import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Image, Linking } from 'react-native';
import MapView, { Marker, Circle, Heatmap, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc } from 'firebase/firestore';
import app from '../../services/firebaseConfig';
import styles from '../../styles/mapa.styles';
import { isAdminUser, observarStatusAdministrador } from '../../services/accessControl';
import { avisarAlertasProximos, distanciaKm } from '../../services/proximityNotifications';
import { GRAVIDADES, RAIOS_ALERTA, dadosGravidade, formatarRaio, orientacaoDoRisco } from '../../services/riskGuidance';
import { buscarClimaAtual } from '../../services/weatherService';
import { CHECKLIST_EVACUACAO, CONTATOS_EMERGENCIA, INSTRUCOES_EVACUACAO } from '../../services/emergencyGuidance';
import { uploadImage } from '../../services/imageUpload';
import { apareceNoMapa, statusEfetivo } from '../../services/alertLifecycle';
import { compartilharAlertaWhatsApp } from '../../services/shareAlert';

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
  { label: 'Enchente', emoji: '🌧️', cor: '#0b57d0' },
  { label: 'Deslizamento', emoji: '⛰️', cor: '#e8710a' },
  { label: 'Vendaval', emoji: '🌪️', cor: '#7b1fa2' },
  { label: 'Seca', emoji: '☀️', cor: '#f9ab00' },
  { label: 'Incêndio florestal', emoji: '🔥', cor: '#d93025' },
];

const OPCOES_TEMPO = [
  { label: '30 Minutos', valor: 30 * 60 * 1000 },
  { label: '1 Hora', valor: 60 * 60 * 1000 },
  { label: '2 Horas', valor: 120 * 60 * 1000 },
];

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
  const parametros = useLocalSearchParams();
  const mapRef = useRef(null);
  const emergenciasExibidas = useRef(new Set());

  const [usuario, setUsuario] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);
  const [regiaoInicial, setRegiaoInicial] = useState(REGIAO_PADRAO);
  const [regiaoAtual, setRegiaoAtual] = useState(REGIAO_PADRAO);
  const [alertas, setAlertas] = useState([]);
  const [historicoAlertas, setHistoricoAlertas] = useState([]);
  const [mapaCalorAtivo, setMapaCalorAtivo] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [modalVisivel, setModalVisivel] = useState(false);
  const [coordenadaSelecionada, setCoordenadaSelecionada] = useState(null);
  const [tipoSelecionado, setTipoSelecionado] = useState('Alagamento');
  const [comentario, setComentario] = useState('');
  const [bairro, setBairro] = useState('');
  const [foto, setFoto] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [tempoSelecionado, setTempoSelecionado] = useState(null); 
  const [gravidadeSelecionada, setGravidadeSelecionada] = useState('Atenção');
  const [raioSelecionado, setRaioSelecionado] = useState(1000);
  const [enderecoMonitorado, setEnderecoMonitorado] = useState(null);
  const [enderecosFamiliares, setEnderecosFamiliares] = useState([]);
  const [clima, setClima] = useState(null);
  const [modalEmergenciaVisivel, setModalEmergenciaVisivel] = useState(false);
  const [alertaEmergencia, setAlertaEmergencia] = useState(null);
  const [administrador, setAdministrador] = useState(false);
  const [alertaSelecionado, setAlertaSelecionado] = useState(null);
  const [modalContatosVisivel, setModalContatosVisivel] = useState(false);

  useEffect(() => {
    let pararAdmin = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      setUsuario(user);
      pararAdmin();
      pararAdmin = observarStatusAdministrador(user, setAdministrador);
    });
    return () => { unsubscribeAuth(); pararAdmin(); };
  }, []);

  useEffect(() => {
    if (parametros.calor === '1') setMapaCalorAtivo(true);
  }, [parametros.calor]);

  useEffect(() => {
    setEnderecoMonitorado(null);
    setEnderecosFamiliares([]);
    if (!usuario) return undefined;

    const unsubscribeEndereco = onSnapshot(doc(db, 'usuarios', usuario.uid), snapshot => {
      const endereco = snapshot.data()?.endereco;
      setEnderecosFamiliares((snapshot.data()?.enderecosFamiliares || []).slice(0, 5));
      if (endereco?.latitude && endereco?.longitude) {
        setEnderecoMonitorado({
          latitude: endereco.latitude,
          longitude: endereco.longitude,
          nome: 'sua residência',
        });
      } else {
        setEnderecoMonitorado(null);
      }
    }, erro => console.error('Erro ao carregar endereço monitorado:', erro));

    return unsubscribeEndereco;
  }, [usuario]);

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
    let inscricao;
    const acompanhar = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      inscricao = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 50 },
        posicao => setLocalizacao({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude })
      );
    };
    acompanhar();
    return () => inscricao?.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'marcacoes'), snapshot => {
      const dados = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoricoAlertas(dados);
      const ativos = dados
        .filter(item => apareceNoMapa(item));
      setAlertas(ativos);
    }, erro => console.error('Erro ao carregar alertas:', erro));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    avisarAlertasProximos(localizacao, alertas, enderecoMonitorado, enderecosFamiliares).catch(erro => console.error('Erro nas notificações:', erro));
  }, [localizacao, alertas, enderecoMonitorado, enderecosFamiliares]);

  useEffect(() => {
    if (!localizacao) return;
    buscarClimaAtual(localizacao)
      .then(setClima)
      .catch(erro => console.error('Erro ao consultar clima:', erro));
  }, [localizacao]);

  const alertasPertoCasa = useMemo(() => {
    if (!enderecoMonitorado) return [];
    return alertas.filter(alerta => distanciaKm(enderecoMonitorado, alerta) <= (alerta.raioMetros || 1000) / 1000);
  }, [alertas, enderecoMonitorado]);

  const alertasPertoFamilia = useMemo(() => enderecosFamiliares.flatMap(endereco => alertas
    .filter(alerta => distanciaKm(endereco, alerta) <= (alerta.raioMetros || 1000) / 1000)
    .map(alerta => ({ alerta, endereco }))), [alertas, enderecosFamiliares]);

  const emergenciasProximas = useMemo(() => alertas.filter(alerta => {
    if (alerta.gravidade !== 'Emergência') return false;
    const raioKm = (alerta.raioMetros || 1000) / 1000;
    const atingeLocalizacao = localizacao && distanciaKm(localizacao, alerta) <= raioKm;
    const atingeResidencia = enderecoMonitorado && distanciaKm(enderecoMonitorado, alerta) <= raioKm;
    const atingeFamiliar = enderecosFamiliares.some(endereco => distanciaKm(endereco, alerta) <= raioKm);
    return atingeLocalizacao || atingeResidencia || atingeFamiliar;
  }), [alertas, localizacao, enderecoMonitorado, enderecosFamiliares]);

  useEffect(() => {
    const emergencia = emergenciasProximas[0];
    if (!emergencia) {
      setAlertaEmergencia(null);
      return;
    }

    setAlertaEmergencia(emergencia);
    const versao = `${emergencia.id}-${emergencia.updatedAtMillis || emergencia.createdAtMillis || 0}`;
    if (!emergenciasExibidas.current.has(versao)) {
      emergenciasExibidas.current.add(versao);
      setModalEmergenciaVisivel(true);
    }
  }, [emergenciasProximas]);

  const alertasFiltrados = useMemo(() => {
    if (filtroAtivo === 'Todos') return alertas;
    return alertas.filter(item => item.tipo === filtroAtivo);
  }, [alertas, filtroAtivo]);

  const pontosMapaCalor = useMemo(() => historicoAlertas
    .filter(item => statusEfetivo(item) !== 'rascunho')
    .filter(item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
    .filter(item => filtroAtivo === 'Todos' || item.tipo === filtroAtivo)
    .map(item => ({
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      weight: 1,
    })), [historicoAlertas, filtroAtivo]);

  const exigirLogin = () => {
    if (!administrador) {
      Alert.alert('Acesso administrativo', 'Somente administradores podem publicar ocorrências.', [
        { text: 'Cancelar', style: 'cancel' },
        ...(!usuario ? [{ text: 'Entrar', onPress: () => router.push('/email-login') }] : []),
      ]);
      return false;
    }
    return true;
  };

  const abrirModalMarcacao = evento => {
    if (!exigirLogin()) return;
    setCoordenadaSelecionada(evento.nativeEvent.coordinate);
    setComentario('');
    setBairro('');
    setFoto(null);
    setTipoSelecionado('Alagamento');
    setTempoSelecionado(null);
    setGravidadeSelecionada('Atenção');
    setRaioSelecionado(1000);
    setModalVisivel(true);
    Location.reverseGeocodeAsync(evento.nativeEvent.coordinate)
      .then(resultados => setBairro(resultados[0]?.district || resultados[0]?.subregion || ''))
      .catch(() => {});
  };

  const pressionouBotaoAzul = async () => {
    if (!exigirLogin()) return;
    
    setComentario('');
    setBairro('');
    setFoto(null);
    setTipoSelecionado('Alagamento');
    setTempoSelecionado(null);
    setGravidadeSelecionada('Atenção');
    setRaioSelecionado(1000);

    if (localizacao) {
      setCoordenadaSelecionada(localizacao);
      setModalVisivel(true);
      Location.reverseGeocodeAsync(localizacao)
        .then(resultados => setBairro(resultados[0]?.district || resultados[0]?.subregion || ''))
        .catch(() => {});
    } else {
      setCoordenadaSelecionada({
        latitude: regiaoAtual.latitude,
        longitude: regiaoAtual.longitude
      });
      setModalVisivel(true);
      Location.reverseGeocodeAsync(regiaoAtual)
        .then(resultados => setBairro(resultados[0]?.district || resultados[0]?.subregion || ''))
        .catch(() => {});
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

  const salvarMarcacao = async (statusInicial = 'ativo') => {
    if (salvando) return;
    const userAtual = auth.currentUser || usuario;
    const texto = comentario.trim();

    if (!isAdminUser(userAtual)) {
      Alert.alert('Acesso negado', 'Somente administradores podem publicar alertas.');
      return;
    }

    if (!texto) {
      Alert.alert('Aviso', 'Escreva uma breve descrição do problema.');
      return;
    }

    if (!bairro.trim()) {
      Alert.alert('Bairro obrigatório', 'Informe o bairro da ocorrência para que ela possa ser localizada no histórico.');
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
        fotoUrl = await uploadImage(foto, `ocorrencias/${userAtual.uid}/${agora}.jpg`);
      }

      const rascunho = statusInicial === 'rascunho';
      await comTimeout(addDoc(collection(db, 'marcacoes'), {
        latitude: coordenadaSelecionada.latitude,
        longitude: coordenadaSelecionada.longitude,
        tipo: tipoSelecionado,
        gravidade: gravidadeSelecionada,
        raioMetros: raioSelecionado,
        comentario: texto,
        bairro: bairro.trim(),
        fotoUrl,
        userId: userAtual.uid,
        userName: userAtual.displayName || userAtual.email || 'Usuário',
        createdAt: serverTimestamp(),
        createdAtMillis: agora,
        updatedAt: serverTimestamp(),
        updatedAtMillis: agora,
        expiresAt: rascunho ? null : agora + duracaoAlerta,
        duracaoMillis: duracaoAlerta,
        status: statusInicial,
        oficial: !rascunho,
        adminEmail: userAtual.email,
        criadoPor: userAtual.email,
        historicoAdministrativo: [{
          acao: rascunho ? 'Salvou a ocorrência como rascunho' : 'Criou e publicou o alerta',
          adminEmail: userAtual.email,
          adminNome: userAtual.displayName || 'Administrador',
          dataMillis: agora,
        }],
      }), 15000);

      setModalVisivel(false);
      Alert.alert(rascunho ? 'Rascunho salvo' : 'Sucesso', rascunho ? 'A ocorrência ficou disponível apenas no painel administrativo.' : 'Alerta adicionado ao mapa!');
    } catch (erro) {
      console.error("Erro detalhado do Firebase:", erro);
      Alert.alert('Erro ao Salvar', 'Não foi possível salvar o alerta. Verifique a internet e as regras do Firestore.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirPerfil = () => {
    if (!usuario) {
      router.push('/email-login');
      return;
    }
    router.push(administrador ? '/admin' : '/perfil');
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
        {mapaCalorAtivo && pontosMapaCalor.length > 0 && (
          <Heatmap
            points={pontosMapaCalor}
            radius={45}
            opacity={0.78}
            gradient={{
              colors: ['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c'],
              startPoints: [0, 0.25, 0.5, 0.75, 1],
              colorMapSize: 256,
            }}
          />
        )}
        {!mapaCalorAtivo && alertasFiltrados.map(item => (
          <Circle
            key={`area-${item.id}`}
            center={{ latitude: item.latitude, longitude: item.longitude }}
            radius={item.raioMetros || 1000}
            fillColor={`${dadosGravidade(item.gravidade).cor}30`}
            strokeColor={dadosGravidade(item.gravidade).cor}
            strokeWidth={2}
          />
        ))}
        {!mapaCalorAtivo && alertasFiltrados.map(item => (
          <Marker key={item.id} coordinate={{ latitude: item.latitude, longitude: item.longitude }} pinColor={dadosGravidade(item.gravidade).cor} onPress={() => setAlertaSelecionado(item)}>
            <Callout tooltip onPress={() => router.push(`/ocorrencia/${item.id}`)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{emojiDoTipo(item.tipo)} {item.tipo}</Text>
                <Text style={item.oficial === true ? styles.officialBadge : styles.previousBadge}>
                  {item.oficial === true ? '✓ ALERTA OFICIAL' : 'REGISTRO ANTERIOR'}
                </Text>
                <Text style={[styles.severityText, { color: dadosGravidade(item.gravidade).cor }]}>
                  {dadosGravidade(item.gravidade).emoji} {item.gravidade || 'Atenção'} · Área de {formatarRaio(item.raioMetros)}
                </Text>
                <Text style={styles.calloutText}>{item.comentario}</Text>
                {item.fotoUrl && <Image source={{ uri: item.fotoUrl }} style={styles.calloutImage} />}
                <Text style={styles.guidanceTitle}>Como se proteger</Text>
                <Text style={styles.guidanceText}>{orientacaoDoRisco(item.tipo)}</Text>
                <Text style={styles.calloutDate}>Publicado em {new Date(item.createdAtMillis || Date.now()).toLocaleString('pt-BR')}</Text>
                {item.updatedAtMillis > item.createdAtMillis && <Text style={styles.calloutDate}>Atualizado em {new Date(item.updatedAtMillis).toLocaleString('pt-BR')}</Text>}
                <Text style={styles.calloutFooter}>Por {item.userName}</Text>
                <Text style={styles.calloutDetails}>Toque para ver todos os detalhes</Text>
              </View>
            </Callout>
          </Marker>
        ))}
        {enderecoMonitorado && (
          <Marker coordinate={enderecoMonitorado} title="Residência monitorada" description="Você receberá avisos de riscos nesta área" pinColor="#1a73e8" />
        )}
        {enderecosFamiliares.map(endereco => (
          <Marker key={`pessoa-${endereco.id}`} coordinate={{ latitude: endereco.latitude, longitude: endereco.longitude }} title={endereco.nome} description="Endereço acompanhado" pinColor={endereco.cor || '#7b1fa2'} />
        ))}
      </MapView>

      <View style={styles.searchBox}>
        <TouchableOpacity style={styles.avatar} onPress={abrirPerfil}>
          <Text style={styles.avatarText}>{iniciais}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.searchTitle}>Zona de Risco</Text>
          <Text style={styles.searchSub}>
            {administrador ? 'Modo administrador: publique ocorrências' : usuario ? 'Alertas naturais próximos de você' : 'Modo visitante: somente consulta'}
          </Text>
        </View>
        <TouchableOpacity accessibilityLabel="Abrir contatos de emergência" style={styles.sosHeaderButton} onPress={() => setModalContatosVisivel(true)}>
          <Text style={styles.sosHeaderText}>SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel={mapaCalorAtivo ? 'Desativar mapa de calor' : 'Ativar mapa de calor'}
          style={[styles.heatmapHeaderButton, mapaCalorAtivo && styles.heatmapHeaderButtonActive]}
          onPress={() => setMapaCalorAtivo(atual => !atual)}
        >
          <Text style={styles.heatmapHeaderText}>🔥</Text>
        </TouchableOpacity>
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

      {mapaCalorAtivo && (
        <View style={styles.heatmapLegend}>
          <Text style={styles.heatmapLegendTitle}>Concentração histórica</Text>
          <View style={styles.heatmapGradient}>
            <View style={[styles.heatmapColor, { backgroundColor: '#2b83ba' }]} />
            <View style={[styles.heatmapColor, { backgroundColor: '#abdda4' }]} />
            <View style={[styles.heatmapColor, { backgroundColor: '#ffffbf' }]} />
            <View style={[styles.heatmapColor, { backgroundColor: '#fdae61' }]} />
            <View style={[styles.heatmapColor, { backgroundColor: '#d7191c' }]} />
          </View>
          <View style={styles.heatmapLegendLabels}><Text style={styles.heatmapLegendText}>Menos</Text><Text style={styles.heatmapLegendText}>Mais</Text></View>
          <Text style={styles.heatmapCount}>{pontosMapaCalor.length} ocorrência(s) analisada(s)</Text>
        </View>
      )}

      {alertasPertoCasa.length > 0 && (
        <TouchableOpacity style={styles.homeWarning} onPress={() => {
          const alerta = alertasPertoCasa[0];
          mapRef.current?.animateToRegion({ latitude: alerta.latitude, longitude: alerta.longitude, latitudeDelta: 0.025, longitudeDelta: 0.025 }, 700);
        }}>
          <Text style={styles.homeWarningText}>🏠 {alertasPertoCasa.length} alerta(s) na área da sua residência</Text>
        </TouchableOpacity>
      )}

      {alertasPertoCasa.length === 0 && alertasPertoFamilia.length > 0 && (
        <TouchableOpacity style={styles.familyWarning} onPress={() => router.push('/familiares')}>
          <Text style={styles.familyWarningText}>👥 {alertasPertoFamilia.length} alerta(s) perto de pessoas acompanhadas</Text>
        </TouchableOpacity>
      )}

      {alertaEmergencia && (
        <TouchableOpacity style={styles.emergencyBanner} onPress={() => setModalEmergenciaVisivel(true)}>
          <Text style={styles.emergencyBannerTitle}>🔴 EMERGÊNCIA NA SUA ÁREA</Text>
          <Text style={styles.emergencyBannerText}>{alertaEmergencia.tipo}: toque para ver as instruções de evacuação</Text>
        </TouchableOpacity>
      )}

      {clima && (
        <View style={styles.weatherBox}>
          <Text style={styles.weatherTitle}>🌤️ {clima.descricao} · {Math.round(clima.temperatura)}°C</Text>
          <Text style={styles.weatherText}>Chuva {clima.chuva ?? 0} mm · Vento {Math.round(clima.vento ?? 0)} km/h</Text>
          <Text style={styles.weatherSource}>Open-Meteo · dados auxiliares</Text>
        </View>
      )}

      {alertaSelecionado && (
        <View style={styles.shareAlertBox}>
          <View style={styles.shareAlertInfo}>
            <Text style={styles.shareAlertTitle}>{emojiDoTipo(alertaSelecionado.tipo)} {alertaSelecionado.tipo}</Text>
            <Text style={styles.shareAlertSubtitle}>{alertaSelecionado.bairro || alertaSelecionado.gravidade || 'Alerta selecionado'}</Text>
          </View>
          <TouchableOpacity style={styles.mapWhatsAppButton} onPress={() => compartilharAlertaWhatsApp(alertaSelecionado)}>
            <Text style={styles.mapWhatsAppText}>💬 WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareAlertClose} onPress={() => setAlertaSelecionado(null)}><Text style={styles.shareAlertCloseText}>✕</Text></TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.locationButton} onPress={() => mapRef.current?.animateToRegion({ ...localizacao, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 700)}>
        <Text style={styles.locationText}>📍</Text>
      </TouchableOpacity>

      {administrador && (
        <TouchableOpacity style={styles.addButton} onPress={pressionouBotaoAzul}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisivel} transparent animationType="slide" onRequestClose={() => setModalVisivel(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisivel(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
            
            <View style={styles.dragIndicator} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.modalTitle}>Nova ocorrência natural</Text>
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

            <Text style={styles.sectionLabel}>Nível de risco:</Text>
            <View style={styles.optionRow}>
              {GRAVIDADES.map(item => (
                <TouchableOpacity key={item.label} onPress={() => setGravidadeSelecionada(item.label)} style={[styles.optionChip, gravidadeSelecionada === item.label && { backgroundColor: item.cor }]}>
                  <Text style={[styles.optionText, gravidadeSelecionada === item.label && styles.optionTextActive]}>{item.emoji} {item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Área afetada:</Text>
            <View style={styles.optionRow}>
              {RAIOS_ALERTA.map(item => (
                <TouchableOpacity key={item.valor} onPress={() => setRaioSelecionado(item.valor)} style={[styles.optionChip, raioSelecionado === item.valor && styles.tempoChipAtivo]}>
                  <Text style={[styles.optionText, raioSelecionado === item.valor && styles.optionTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.guidanceBox}>
              <Text style={styles.guidanceTitle}>🛡️ Orientação que será exibida</Text>
              <Text style={styles.guidanceText}>{orientacaoDoRisco(tipoSelecionado)}</Text>
            </View>

            {gravidadeSelecionada === 'Emergência' && (
              <View style={styles.emergencyAdminNotice}>
                <Text style={styles.emergencyAdminTitle}>🔴 Este alerta acionará o modo de emergência</Text>
                <Text style={styles.emergencyAdminText}>Usuários dentro da área receberão instruções de evacuação, checklist e telefones de emergência.</Text>
              </View>
            )}

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

            <TextInput
              style={styles.neighborhoodInput}
              placeholder="Bairro da ocorrência"
              placeholderTextColor="#777"
              value={bairro}
              onChangeText={setBairro}
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
              <TouchableOpacity style={[styles.modalButton, styles.draftButton]} onPress={() => salvarMarcacao('rascunho')} disabled={salvando}>
                <Text style={styles.draftText}>Salvar rascunho</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={() => salvarMarcacao('ativo')} disabled={salvando}>
                <Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Publicar'}</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalEmergenciaVisivel} transparent animationType="fade" onRequestClose={() => setModalEmergenciaVisivel(false)}>
        <View style={styles.emergencyOverlay}>
          <View style={styles.emergencyModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.emergencyHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emergencyTitle}>🔴 Alerta de emergência</Text>
                  <Text style={styles.emergencySubtitle}>{alertaEmergencia?.tipo || 'Risco natural'} na sua área</Text>
                </View>
                <TouchableOpacity style={styles.emergencyClose} onPress={() => setModalEmergenciaVisivel(false)}>
                  <Text style={styles.emergencyCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {!!alertaEmergencia?.comentario && <Text style={styles.emergencyDescription}>{alertaEmergencia.comentario}</Text>}

              <TouchableOpacity style={styles.emergencyShareButton} onPress={() => compartilharAlertaWhatsApp(alertaEmergencia)}>
                <Text style={styles.emergencyShareText}>💬 Compartilhar este alerta no WhatsApp</Text>
              </TouchableOpacity>

              <Text style={styles.emergencySectionTitle}>O que fazer agora</Text>
              {INSTRUCOES_EVACUACAO.map((instrucao, indice) => (
                <View key={instrucao} style={styles.emergencyItem}>
                  <Text style={styles.emergencyNumber}>{indice + 1}</Text>
                  <Text style={styles.emergencyItemText}>{instrucao}</Text>
                </View>
              ))}

              <Text style={styles.emergencySectionTitle}>Checklist para evacuação</Text>
              {CHECKLIST_EVACUACAO.map(item => <Text key={item} style={styles.checklistItem}>☐ {item}</Text>)}

              <Text style={styles.emergencySectionTitle}>Contatos de emergência</Text>
              <View style={styles.contactList}>
                {CONTATOS_EMERGENCIA.map(contato => (
                  <TouchableOpacity key={contato.numero} style={styles.contactButton} onPress={() => Linking.openURL(`tel:${contato.numero}`)}>
                    <Text style={styles.contactName}>{contato.emoji} {contato.nome}</Text>
                    <Text style={styles.contactNumber}>Ligar {contato.numero}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.offlineNotice}>📴 Estas instruções ficam disponíveis no aplicativo mesmo sem internet.</Text>
              <TouchableOpacity style={styles.shelterButton} onPress={() => {
                setModalEmergenciaVisivel(false);
                router.push('/abrigos');
              }}>
                <Text style={styles.shelterButtonText}>🏠 Ver abrigos e pontos seguros</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalContatosVisivel} transparent animationType="fade" onRequestClose={() => setModalContatosVisivel(false)}>
        <View style={styles.contactsOverlay}>
          <View style={styles.contactsModal}>
            <View style={styles.contactsHeader}>
              <View style={{ flex: 1 }}><Text style={styles.contactsTitle}>🆘 Contatos de emergência</Text><Text style={styles.contactsSubtitle}>Escolha um serviço para abrir o número no discador.</Text></View>
              <TouchableOpacity style={styles.emergencyClose} onPress={() => setModalContatosVisivel(false)}><Text style={styles.emergencyCloseText}>✕</Text></TouchableOpacity>
            </View>
            {CONTATOS_EMERGENCIA.map(contato => (
              <TouchableOpacity key={contato.numero} style={styles.dialButton} onPress={() => Linking.openURL(`tel:${contato.numero}`)}>
                <View><Text style={styles.dialName}>{contato.emoji} {contato.nome}</Text><Text style={styles.dialHint}>Abrir no discador</Text></View>
                <Text style={styles.dialNumber}>{contato.numero}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.dialNotice}>O aplicativo apenas preenche o número. Você confirma a chamada no telefone.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
