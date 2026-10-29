import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, TextInput, Image, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc } from 'firebase/firestore';
import { Entypo, Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons, Feather, FontAwesome, FontAwesome6 } from '@expo/vector-icons';

import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { isAdminUser, observarStatusAdministrador } from '../../services/accessControl';
import { avisarAlertasProximos, distanciaKm } from '../../services/proximityNotifications';
import { GRAVIDADES, RAIOS_ALERTA, dadosGravidade, formatarRaio, orientacaoDoRisco } from '../../services/riskGuidance';
import { buscarClimaAtual } from '../../services/weatherService';
import { CHECKLIST_EVACUACAO, CONTATOS_EMERGENCIA, INSTRUCOES_EVACUACAO } from '../../services/emergencyGuidance';
import { uploadImage } from '../../services/imageUpload';
import { apareceNoMapa, statusEfetivo } from '../../services/alertLifecycle';
import { compartilharAlertaWhatsApp } from '../../services/shareAlert';

import app from '../../services/firebaseConfig';
import styles from '../../styles/mapa.styles';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN);

const db = getFirestore(app);
const auth = getAuth(app);

const REGIAO_PADRAO = {
  latitude: 0,
  longitude: 0,
};

const TIPOS_ALERTA = [
  { label: ' Todos', renderIcon: (color) => <Entypo name="map" size={18} color={color} />, cor: '#1a73e8' },
  { label: ' Alagamento', renderIcon: (color) => <MaterialCommunityIcons name="water" size={18} color={color} />, cor: '#1a73e8' },
  { label: ' Enchente', renderIcon: (color) => <Ionicons name="rainy" size={18} color={color} />, cor: '#0b57d0' },
  { label: ' Deslizamento', renderIcon: (color) => <FontAwesome5 name="mountain" size={18} color={color} />, cor: '#e8710a' },
  { label: ' Vendaval', renderIcon: (color) => <Feather name="wind" size={18} color={color} />, cor: '#7b1fa2' },
  { label: ' Incêndio florestal', renderIcon: (color) => <MaterialCommunityIcons name="fire" size={18} color={color} />, cor: '#d93025' },
];

const OPCOES_TEMPO = [
  { label: '30 Minutos', valor: 30 * 60 * 1000 },
  { label: '1 Hora', valor: 60 * 60 * 1000 },
  { label: '2 Horas', valor: 120 * 60 * 1000 },
];

function iconeDoTipo(tipo, cor = '#5f6368') {
  const encontrado = TIPOS_ALERTA.find(item => item.label.trim() === tipo?.trim());
  return encontrado ? encontrado.renderIcon(cor) : <Entypo name="location-pin" size={18} color={cor} />;
}

function comTimeout(promise, ms = 25000) { 
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo esgotado. Verifique a internet.')), ms)),
  ]);
}

function gerarCirculoGeoJSON(centroLong, centroLat, raioMetros, id, corHex) {
  const coords = [];
  const raioTerra = 6378137;
  for (let i = 0; i <= 64; i++) {
    const angulo = (i * 360) / 64;
    const theta = angulo * (Math.PI / 180);
    const latRad = centroLat * (Math.PI / 180);
    const dx = raioMetros * Math.cos(theta);
    const dy = raioMetros * Math.sin(theta);
    const lat = centroLat + (dy / raioTerra) * (180 / Math.PI);
    const lon = centroLong + (dx / (raioTerra * Math.cos(latRad))) * (180 / Math.PI);
    coords.push([lon, lat]);
  }
  return {
    type: 'Feature',
    id: id,
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: { cor: corHex }
  };
}

export default function MapScreen() {
  const router = useRouter();
  const parametros = useLocalSearchParams();
  const cameraRef = useRef(null);
  const emergenciasExibidas = useRef(new Set());
  const insets = useSafeAreaInsets();

  const [usuario, setUsuario] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);
  const [regiaoAtual, setRegiaoAtual] = useState(REGIAO_PADRAO);
  const [alertas, setAlertas] = useState([]);
  const [pontosSeguros, setPontosSeguros] = useState([]);
  const [historicoAlertas, setHistoricoAlertas] = useState([]);
  const [mapaCalorAtivo, setMapaCalorAtivo] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState(' Todos');
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
        const novaLocalizacao = { latitude: posicao.coords.latitude, longitude: posicao.coords.longitude };

        setLocalizacao({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude });

        cameraRef.current?.setCamera({
          centerCoordinate: [novaLocalizacao.longitude, novaLocalizacao.latitude],
          zoomLevel: 14,
          animationDuration: 1000,
        });
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
      const dados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoricoAlertas(dados);
      setAlertas(dados.filter(item => apareceNoMapa(item)));
    }, erro => console.error('Erro ao carregar alertas:', erro));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'abrigos'), snapshot => {
      setPontosSeguros(snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() })));
    }, erro => console.error('Erro ao carregar pontos seguros:', erro));
    return () => unsubscribe();
  }, []);

  const abrirRotaPontoSeguro = async ponto => {
    if (ponto.situacao !== 'Aberto') {
      Alert.alert('Atenção', `Este ponto está marcado como "${ponto.situacao || 'situação não informada'}". Confira com as autoridades antes de ir.`);
      return;
    }
    const temCoordenadas = Number.isFinite(ponto.latitude) && Number.isFinite(ponto.longitude);
    const destino = temCoordenadas ? `${ponto.latitude},${ponto.longitude}` : encodeURIComponent(ponto.endereco || '');
    const origem = localizacao ? `&origin=${localizacao.latitude},${localizacao.longitude}` : '';
    try {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1${origem}&destination=${destino}&travelmode=walking`);
    } catch (erro) {
      Alert.alert('Rota indisponível', 'Não foi possível abrir o Google Maps agora.');
    }
  };

  useEffect(() => {
    avisarAlertasProximos(localizacao, alertas, enderecoMonitorado, enderecosFamiliares).catch(erro => console.error('Erro nas notificações:', erro));
  }, [localizacao, alertas, enderecoMonitorado, enderecosFamiliares]);

  useEffect(() => {
    if (!localizacao) return;
    buscarClimaAtual(localizacao).then(setClima).catch(erro => console.error('Erro ao consultar clima:', erro));
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

  const heatmapGeoJSON = useMemo(() => {
    const features = historicoAlertas
      .filter(item => statusEfetivo(item) !== 'rascunho')
      .filter(item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
      .filter(item => filtroAtivo === 'Todos' || item.tipo === filtroAtivo)
      .map(item => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(item.longitude), Number(item.latitude)] },
        properties: { weight: 1 }
      }));
    return { type: 'FeatureCollection', features };
  }, [historicoAlertas, filtroAtivo]);

  const areasGeoJSON = useMemo(() => {
    const features = alertasFiltrados.map(item => 
      gerarCirculoGeoJSON(item.longitude, item.latitude, item.raioMetros || 1000, item.id, dadosGravidade(item.gravidade).cor)
    );
    return { type: 'FeatureCollection', features };
  }, [alertasFiltrados]);

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
    const [lon, lat] = evento.geometry.coordinates;
    const coords = { latitude: lat, longitude: lon };
    setCoordenadaSelecionada(coords);
    setComentario('');
    setBairro('');
    setFoto(null);
    setTipoSelecionado(' Alagamento');
    setTempoSelecionado(null);
    setGravidadeSelecionada('Atenção');
    setRaioSelecionado(1000);
    setModalVisivel(true);
    Location.reverseGeocodeAsync(coords)
      .then(resultados => setBairro(resultados[0]?.district || resultados[0]?.subregion || ''))
      .catch(() => {});
  };

  const pressionouBotaoAzul = async () => {
    if (!exigirLogin()) return;
    setComentario('');
    setBairro('');
    setFoto(null);
    setTipoSelecionado(' Alagamento');
    setTempoSelecionado(null);
    setGravidadeSelecionada('Atenção');
    setRaioSelecionado(1000);

    const pos = localizacao || regiaoAtual;
    setCoordenadaSelecionada(pos);
    setModalVisivel(true);
    Location.reverseGeocodeAsync(pos)
      .then(resultados => setBairro(resultados[0]?.district || resultados[0]?.subregion || ''))
      .catch(() => {});
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

    if (!isAdminUser(userAtual)) return Alert.alert('Acesso negado', 'Somente administradores podem publicar alertas.');
    if (!texto) return Alert.alert('Aviso', 'Escreva uma breve descrição do problema.');
    if (!bairro.trim()) return Alert.alert('Bairro obrigatório', 'Informe o bairro da ocorrência.');
    if (!coordenadaSelecionada) return Alert.alert('Erro', 'Não foi possível detectar a localização do marcador.');

    try {
      setSalvando(true);
      const agora = Date.now();
      let duracaoAlerta = tempoSelecionado !== null ? tempoSelecionado : (foto ? 60 * 60 * 1000 : 30 * 60 * 1000);
      let fotoUrl = foto ? await uploadImage(foto, `ocorrencias/${userAtual.uid}/${agora}.jpg`) : null;
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
      Alert.alert('Erro ao Salvar', 'Não foi possível salvar o alerta. Verifique a internet e as regras do Firestore.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirPerfil = () => {
    if (!usuario) return router.push('/email-login');
    router.push(administrador ? '/admin' : '/perfil');
  };

  const iniciais = useMemo(() => {
    const nome = usuario?.displayName || usuario?.email || 'Visitante';
    return nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }, [usuario]);

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        scaleBarEnabled={false}
        compassEnabled={false}
        onPress={abrirModalMarcacao}
        onLongPress={abrirModalMarcacao}
        logoEnabled={false}
        attributionEnabled={false}
        styleURL="mapbox://styles/mapbox/streets-v12"
        onCameraChanged={e => {
          if (e.geometry?.coordinates) {
            setRegiaoAtual({ latitude: e.geometry.coordinates[1], longitude: e.geometry.coordinates[0] });
          }
        }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [REGIAO_PADRAO.longitude, REGIAO_PADRAO.latitude],
            zoomLevel: 13,
          }}
        />

        <Mapbox.UserLocation visible={!!localizacao} />

        {mapaCalorAtivo && heatmapGeoJSON.features.length > 0 && (
          <Mapbox.ShapeSource id="heatmapSource" shape={heatmapGeoJSON}>
            <Mapbox.HeatmapLayer
              id="heatmapLayer"
              style={{
                heatmapWeight: 1,
                heatmapIntensity: 1,
                heatmapRadius: 40,
                heatmapOpacity: 0.8,
                heatmapColor: [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(33,102,172,0)',
                  0.2, '#abdda4',
                  0.5, '#ffffbf',
                  0.8, '#fdae61',
                  1, '#d7191c'
                ]
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {!mapaCalorAtivo && areasGeoJSON.features.length > 0 && (
          <Mapbox.ShapeSource id="areasSource" shape={areasGeoJSON}>
            <Mapbox.FillLayer id="areasFill" style={{ fillColor: ['get', 'cor'], fillOpacity: 0.15 }} />
            <Mapbox.LineLayer id="areasLine" style={{ lineColor: ['get', 'cor'], lineWidth: 2 }} />
          </Mapbox.ShapeSource>
        )}

        {!mapaCalorAtivo && alertasFiltrados.map(item => (
          <Mapbox.PointAnnotation
            key={item.id}
            id={item.id}
            coordinate={[item.longitude, item.latitude]}
            onSelected={() => setAlertaSelecionado(item)}
          >
            <View style={{ width: 22, height: 22, backgroundColor: dadosGravidade(item.gravidade).cor, borderRadius: 11, borderWidth: 2, borderColor: '#fff' }} />
            <Mapbox.Callout>
              <TouchableOpacity style={styles.callout} onPress={() => router.push(`/ocorrencia/${item.id}`)}>
                <Text style={styles.calloutTitle}>{item.tipo}</Text>
                <Text style={item.oficial === true ? styles.officialBadge : styles.previousBadge}>{item.oficial === true ? '✓ ALERTA OFICIAL' : 'REGISTRO ANTERIOR'}</Text>
                <Text style={[styles.severityText, { color: dadosGravidade(item.gravidade).cor }]}>{dadosGravidade(item.gravidade).emoji} {item.gravidade || 'Atenção'} · Área de {formatarRaio(item.raioMetros)}</Text>
                <Text style={styles.calloutText}>{item.comentario}</Text>
                {item.fotoUrl && <Image source={{ uri: item.fotoUrl }} style={styles.calloutImage} />}
                <Text style={styles.guidanceTitle}>Como se proteger</Text>
                <Text style={styles.guidanceText}>{orientacaoDoRisco(item.tipo)}</Text>
                <Text style={styles.calloutDate}>Publicado em {new Date(item.createdAtMillis || Date.now()).toLocaleString('pt-BR')}</Text>
                <Text style={styles.calloutDetails}>Toque para ver todos os detalhes</Text>
              </TouchableOpacity>
            </Mapbox.Callout>
          </Mapbox.PointAnnotation>
        ))}

        {!mapaCalorAtivo && pontosSeguros
          .filter(ponto => Number.isFinite(ponto.latitude) && Number.isFinite(ponto.longitude))
          .map(ponto => (
            <Mapbox.PointAnnotation
              key={`ponto-seguro-${ponto.id}`}
              id={`ponto-seguro-${ponto.id}`}
              coordinate={[ponto.longitude, ponto.latitude]}
            >
              <View style={{ width: 24, height: 24, backgroundColor: ponto.situacao === 'Aberto' ? '#188038' : '#9aa0a6', borderRadius: 12, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>S</Text>
              </View>
              <Mapbox.Callout>
                <View style={{ padding: 8, width: 220 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#202124' }}>{ponto.nome || 'Ponto seguro'}</Text>
                  <Text style={{ fontSize: 12, color: '#5f6368', marginVertical: 4 }}>{ponto.categoria || 'Ponto de encontro'} · {ponto.situacao || 'Situação não informada'}</Text>
                  <Text style={{ fontSize: 12, color: '#3c4043' }}>{ponto.endereco || 'Endereço não informado'}</Text>
                  <TouchableOpacity
                    onPress={() => abrirRotaPontoSeguro(ponto)}
                    style={{ backgroundColor: '#188038', padding: 9, borderRadius: 7, marginTop: 8 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>Traçar rota até aqui</Text>
                  </TouchableOpacity>
                </View>
              </Mapbox.Callout>
            </Mapbox.PointAnnotation>
          ))}

        {enderecoMonitorado && (
          <Mapbox.PointAnnotation id="residencia" coordinate={[enderecoMonitorado.longitude, enderecoMonitorado.latitude]}>
            <View style={{ width: 18, height: 18, backgroundColor: '#1a73e8', borderRadius: 9, borderWidth: 2, borderColor: '#fff' }} />
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>

      <View style={[styles.searchBox, { marginTop: insets.top - 35 }]}>
        <TouchableOpacity style={styles.avatar} onPress={abrirPerfil}><Text style={styles.avatarText}>{iniciais}</Text></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.searchTitle}>Zona de Risco</Text><Text style={styles.searchSub}>{administrador ? 'Modo administrador' : 'Alertas naturais próximos'}</Text></View>
        <TouchableOpacity style={styles.sosHeaderButton} onPress={() => setModalContatosVisivel(true)}><Text style={styles.sosHeaderText}>SOS</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.heatmapHeaderButton, mapaCalorAtivo && styles.heatmapHeaderButtonActive]} onPress={() => setMapaCalorAtivo(atual => !atual)}>
          <MaterialCommunityIcons name="fire" size={24} color="black" />
          </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/config')}>
          <Entypo name="tools" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterBar, { marginTop: insets.top - 35 }]}>
        {TIPOS_ALERTA.map(tipo => (
          <TouchableOpacity key={tipo.label} onPress={() => setFiltroAtivo(tipo.label)} style={[styles.chip, { flexDirection: 'row', alignItems: 'center' }, filtroAtivo === tipo.label && { backgroundColor: tipo.cor }]}>
            {tipo.renderIcon(filtroAtivo === tipo.label ? '#fff' : '#5f6368')}
            <Text style={[styles.chipText, filtroAtivo === tipo.label && { color: '#fff' }]}>{tipo.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {alertaSelecionado && (
        <View style={styles.shareAlertBox}>
          <View style={styles.shareAlertInfo}>
            <Text style={styles.shareAlertTitle}>{alertaSelecionado.tipo}</Text>
            <Text style={styles.shareAlertSubtitle}>{alertaSelecionado.bairro || alertaSelecionado.gravidade}</Text>
          </View>
          <TouchableOpacity style={styles.mapWhatsAppButton} onPress={() => compartilharAlertaWhatsApp(alertaSelecionado)}><Text style={styles.mapWhatsAppText}>💬 WhatsApp</Text></TouchableOpacity>
          <TouchableOpacity style={styles.shareAlertClose} onPress={() => setAlertaSelecionado(null)}><Text style={styles.shareAlertCloseText}>✕</Text></TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={[styles.locationButton, { bottom: insets.bottom - 25 }]} onPress={() => {
        if(localizacao) {
          cameraRef.current?.setCamera({ centerCoordinate: [localizacao.longitude, localizacao.latitude], zoomLevel: 14, animationDuration: 700 });
        }
      }}>
        <FontAwesome name="map-pin" size={24} color="black" />
      </TouchableOpacity>

      {administrador && (
        <TouchableOpacity style={[styles.addButton, { bottom: insets.bottom + 50 }]} onPress={pressionouBotaoAzul}>
          <FontAwesome6 name="plus" size={24} color="black" />
        </TouchableOpacity>
      )}

      {/* Modal de Nova Ocorrência */}
      <Modal visible={modalVisivel} transparent animationType="slide" onRequestClose={() => setModalVisivel(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisivel(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.dragIndicator} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.modalTitle}>Nova ocorrência</Text>
                <TouchableOpacity onPress={() => setModalVisivel(false)} style={styles.closeButtonMini}><Text style={{ fontSize: 16, fontWeight: 'bold' }}>✕</Text></TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Selecione o tipo:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {TIPOS_ALERTA.filter(t => t.label !== ' Todos').map(tipo => (
                  <TouchableOpacity key={tipo.label} onPress={() => setTipoSelecionado(tipo.label)} style={[styles.tipoChip, { flexDirection: 'row', alignItems: 'center' }, tipoSelecionado === tipo.label && { backgroundColor: tipo.cor }]}>
                    {tipo.renderIcon(tipoSelecionado === tipo.label ? '#fff' : '#5f6368')}
                    <Text style={[styles.tipoText, tipoSelecionado === tipo.label && { color: '#fff' }]}>{tipo.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionLabel}>Área afetada:</Text>
              <View style={styles.optionRow}>
                {RAIOS_ALERTA.map(item => (
                  <TouchableOpacity key={item.valor} onPress={() => setRaioSelecionado(item.valor)} style={[styles.optionChip, raioSelecionado === item.valor && styles.tempoChipAtivo]}>
                    <Text style={[styles.optionText, raioSelecionado === item.valor && styles.optionTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput style={styles.input} placeholder="Descreva a situação atual..." value={comentario} onChangeText={setComentario} multiline />
              <TextInput style={styles.neighborhoodInput} placeholder="Bairro" value={bairro} onChangeText={setBairro} />
              {foto && <Image source={{ uri: foto }} style={styles.preview} />}

              <View style={styles.photoRow}>
                <TouchableOpacity style={styles.photoButton} onPress={tirarFoto}><Text style={styles.photoText}>📷 Tirar foto</Text></TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={escolherFoto}><Text style={styles.photoText}>🖼️ Galeria</Text></TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisivel(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={() => salvarMarcacao('ativo')} disabled={salvando}><Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Publicar'}</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Contatos de Emergência (SOS) */}
      <Modal visible={modalContatosVisivel} transparent animationType="slide" onRequestClose={() => setModalContatosVisivel(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalContatosVisivel(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.dragIndicator} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={styles.modalTitle}>Contatos de Emergência (SOS)</Text>
                <TouchableOpacity onPress={() => setModalContatosVisivel(false)} style={styles.closeButtonMini}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionLabel, { marginBottom: 15, color: '#5f6368' }]}>
                Em caso de perigo imediato, ligue para os serviços de emergência:
              </Text>

              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#d93025', marginBottom: 10, padding: 12, borderRadius: 8 }]} 
                onPress={() => Linking.openURL('tel:193')}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>🚨 Bombeiros: 193</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#1a73e8', marginBottom: 10, padding: 12, borderRadius: 8 }]} 
                onPress={() => Linking.openURL('tel:199')}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>🛡️ Defesa Civil: 199</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#34a853', marginBottom: 20, padding: 12, borderRadius: 8 }]} 
                onPress={() => Linking.openURL('tel:190')}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>👮 Polícia: 190</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setModalContatosVisivel(false)}
              >
                <Text style={styles.cancelText}>Fechar</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Alerta de Emergência Automático (Orientações, Checklist e Contactos) */}
      <Modal 
        visible={modalEmergenciaVisivel} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setModalEmergenciaVisivel(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalEmergenciaVisivel(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.dragIndicator} />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, marginRight: 8 }}>🔴</Text>
                  <Text style={[styles.modalTitle, { color: '#d93025' }]}>Alerta de emergência</Text>
                </View>
                <TouchableOpacity onPress={() => setModalEmergenciaVisivel(false)} style={styles.closeButtonMini}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#202124', marginBottom: 8 }}>
                {alertaEmergencia?.tipo || 'Deslizamento'} na sua área
              </Text>

              <View style={{ backgroundColor: '#fce8e6', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ color: '#c5221f', fontWeight: '500' }}>
                  {alertaEmergencia?.comentario || 'Deslizamento de terra'}
                </Text>
              </View>

              <Text style={[styles.sectionLabel, { fontSize: 16, fontWeight: 'bold', color: '#202124', marginBottom: 12 }]}>
                O que fazer agora
              </Text>

              <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#d93025', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>1</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: '#3c4043', lineHeight: 20 }}>Mantenha a calma e siga as orientações das autoridades.</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#d93025', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>2</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: '#3c4043', lineHeight: 20 }}>Saia pela rota segura; não atravesse água, fumaça ou área interditada.</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#d93025', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>3</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: '#3c4043', lineHeight: 20 }}>Se houver tempo e segurança, desligue energia e gás antes de sair.</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#d93025', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>4</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: '#3c4043', lineHeight: 20 }}>Ajude crianças, idosos, pessoas com deficiência e animais.</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#d93025', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>5</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: '#3c4043', lineHeight: 20 }}>Vá para um abrigo ou ponto seguro indicado no aplicativo.</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#d93025', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>6</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: '#3c4043', lineHeight: 20 }}>Não volte ao local até a liberação oficial.</Text>
              </View>

              <Text style={[styles.sectionLabel, { fontSize: 16, fontWeight: 'bold', color: '#202124', marginBottom: 12 }]}>
                Checklist para evacuação
              </Text>

              {[
                'Documentos pessoais e contatos importantes',
                'Água potável e alimentos rápidos',
                'Medicamentos de uso contínuo e receitas',
                'Celular, carregador e bateria portátil',
                'Lanterna, pilhas e rádio, se disponível',
                'Roupas básicas, cobertor e itens de higiene',
                'Itens essenciais para crianças, idosos e animais'
              ].map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>☐</Text>
                  <Text style={{ fontSize: 14, color: '#3c4043' }}>{item}</Text>
                </View>
              ))}

              <Text style={[styles.sectionLabel, { fontSize: 16, fontWeight: 'bold', color: '#202124', marginTop: 12, marginBottom: 12 }]}>
                Contatos de emergência
              </Text>

              <TouchableOpacity 
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8 }}
                onPress={() => Linking.openURL('tel:199')}
              >
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#202124' }}>🛡️ Defesa Civil</Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#d93025' }}>Ligar 199</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8 }}
                onPress={() => Linking.openURL('tel:193')}
              >
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#202124' }}>🚒 Bombeiros</Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#d93025' }}>Ligar 193</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 12 }}
                onPress={() => Linking.openURL('tel:192')}
              >
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#202124' }}>🚑 SAMU</Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#d93025' }}>Ligar 192</Text>
              </TouchableOpacity>

              <View style={{ backgroundColor: '#e8f0fe', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: '#1a73e8' }}>
                  📲 Estas instruções ficam disponíveis no aplicativo mesmo sem internet.
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#1a73e8', padding: 14, borderRadius: 8, marginBottom: 10 }]} 
                onPress={() => {
                  setModalEmergenciaVisivel(false);
                  router.push('/abrigos');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 15 }}>
                  🏠 Ver abrigos e pontos seguros
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}