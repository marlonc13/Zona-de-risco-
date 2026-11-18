import { View, TouchableOpacity, Alert, ScrollView, Image, Linking, ActivityIndicator, BackHandler } from 'react-native';
import { Text, TextInput } from '../../components/texto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc } from 'firebase/firestore';
import { Entypo, Ionicons, FontAwesome5, MaterialCommunityIcons, Feather, FontAwesome, FontAwesome6 } from '@expo/vector-icons';

import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { isAdminUser, observarStatusAdministrador } from '../../services/accessControl';
import { avisarAlertasProximos, distanciaKm } from '../../services/proximityNotifications';
import { GRAVIDADES, RAIOS_ALERTA, dadosGravidade, formatarRaio, orientacaoDoRisco } from '../../services/riskGuidance';
import { buscarClimaAtual } from '../../services/weatherService';
import { uploadImage } from '../../services/imageUpload';
import CameraCaptura from '../../components/camera-captura';
import ModalDeslizante, { RolagemModal } from '../../components/modal-deslizante';
import Icone, { IconeGravidade, IconeTipo } from '../../components/icone';
import { apareceNoMapa, statusEfetivo, dentroDoPeriodo, periodoValido, PERIODOS_MAPA_CALOR, PERIODO_PADRAO_MAPA_CALOR } from '../../services/alertLifecycle';
import { compartilharAlertaWhatsApp } from '../../services/shareAlert';

import app from '../../services/firebaseConfig';
import { useTema, useEstilos } from '../../hooks/use-tema';
import estilosMapa from '../../styles/mapa.styles';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN);

const db = getFirestore(app);
const auth = getAuth(app);

// Estilo do mapa conforme o tema escolhido em Configurações
const ESTILO_MAPA = {
  light: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/navigation-night-v1',
};

// Sem nenhuma localização conhecida, o mapa abre mostrando o Brasil (e não o meio do oceano)
const REGIAO_PADRAO = {
  latitude: -14.235,
  longitude: -51.9253,
};
const ZOOM_PADRAO = 3.5;
const ZOOM_USUARIO = 14;

// Última posição do usuário, para o mapa já abrir no lugar certo na próxima vez
const CHAVE_ULTIMA_LOCALIZACAO = 'ultimaLocalizacaoMapa';
const CHAVE_PERIODO_MAPA_CALOR = 'periodoMapaCalor';

const TIPOS_ALERTA = [
  { label: 'Todos', renderIcon: (color) => <Entypo name="map" size={18} color={color} />, cor: '#1a73e8' },
  { label: 'Alagamento', renderIcon: (color) => <MaterialCommunityIcons name="water" size={18} color={color} />, cor: '#1a73e8' },
  { label: 'Enchente', renderIcon: (color) => <Ionicons name="rainy" size={18} color={color} />, cor: '#0b57d0' },
  { label: 'Deslizamento', renderIcon: (color) => <FontAwesome5 name="mountain" size={18} color={color} />, cor: '#e8710a' },
  { label: 'Vendaval', renderIcon: (color) => <Feather name="wind" size={18} color={color} />, cor: '#7b1fa2' },
  { label: 'Incêndio florestal', renderIcon: (color) => <MaterialCommunityIcons name="fire" size={18} color={color} />, cor: '#d93025' },
];

// Distância entre a barra "Zona de Risco" e os filtros de tipo
const ESPACO_FILTROS = 22;

const OPCOES_TEMPO = [
  { label: '30 Minutos', valor: 30 * 60 * 1000 },
  { label: '1 Hora', valor: 60 * 60 * 1000 },
  { label: '2 Horas', valor: 120 * 60 * 1000 },
];

function comTimeout(promise, ms = 25000) { 
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo esgotado. Verifique a internet.')), ms)),
  ]);
}

function gerarCirculoGeoJSON(centroLong, centroLat, raioMetros, id, corHex) {
  const lon = Number(centroLong);
  const lat = Number(centroLat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

  const coords = [];
  const raioTerra = 6378137;
  const raio = raioMetros || 1000;

  for (let i = 0; i <= 64; i++) {
    const angulo = (i * 360) / 64;
    const theta = angulo * (Math.PI / 180);
    const latRad = lat * (Math.PI / 180);
    const dx = raio * Math.cos(theta);
    const dy = raio * Math.sin(theta);
    const latPonto = lat + (dy / raioTerra) * (180 / Math.PI);
    const lonPonto = lon + (dx / (raioTerra * Math.cos(latRad))) * (180 / Math.PI);
    coords.push([lonPonto, latPonto]);
  }

  return {
    type: 'Feature',
    id: String(id),
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: { cor: corHex || '#1a73e8' }
  };
}

export default function MapScreen() {
  const router = useRouter();
  const parametros = useLocalSearchParams();
  const cameraRef = useRef(null);
  const emergenciasExibidas = useRef(new Set());
  const insets = useSafeAreaInsets();
  const { tema, cores } = useTema();
  const styles = useEstilos(estilosMapa);
  const estiloMapa = ESTILO_MAPA[tema];

  const [usuario, setUsuario] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);
  const [regiaoAtual, setRegiaoAtual] = useState(REGIAO_PADRAO);
  const [alertas, setAlertas] = useState([]);
  const [pontosSeguros, setPontosSeguros] = useState([]);
  const [historicoAlertas, setHistoricoAlertas] = useState([]);
  const [mapaCalorAtivo, setMapaCalorAtivo] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  // Período em vigor (salvo no aparelho) e o escolhido que ainda espera o "Aplicar".
  // Enquanto não é confirmado, o escolhido só serve de prévia e é descartado ao sair.
  const [periodoConfirmado, setPeriodoConfirmado] = useState(PERIODO_PADRAO_MAPA_CALOR);
  const [periodoEmEscolha, setPeriodoEmEscolha] = useState(null);
  const periodoMapaCalor = periodoEmEscolha ?? periodoConfirmado;
  const [modalVisivel, setModalVisivel] = useState(false);
  const [coordenadaSelecionada, setCoordenadaSelecionada] = useState(null);
  const [tipoSelecionado, setTipoSelecionado] = useState('Alagamento');
  const [comentario, setComentario] = useState('');
  const [bairro, setBairro] = useState('');
  const [foto, setFoto] = useState(null);
  const [cameraVisivel, setCameraVisivel] = useState(false);
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
  // Fim da barra "Zona de Risco": os filtros ficam logo abaixo dela, mesmo com "Letras grandes"
  const [fimBarraSuperior, setFimBarraSuperior] = useState(null);
  const [fimFiltros, setFimFiltros] = useState(null);
  const [centroInicial, setCentroInicial] = useState(null);
  const jaCentralizou = useRef(false);
  const usuarioMexeuNoMapa = useRef(false);

  const fecharContatos = () => setModalContatosVisivel(false);

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
    AsyncStorage.getItem(CHAVE_PERIODO_MAPA_CALOR)
      .then(salvo => { if (periodoValido(salvo)) setPeriodoConfirmado(salvo); })
      .catch(() => {});
  }, []);

  const escolherPeriodo = periodoId => {
    setPeriodoEmEscolha(periodoId === periodoConfirmado ? null : periodoId);
  };

  const aplicarPeriodo = () => {
    if (!periodoEmEscolha) return;
    setPeriodoConfirmado(periodoEmEscolha);
    AsyncStorage.setItem(CHAVE_PERIODO_MAPA_CALOR, periodoEmEscolha).catch(() => {});
    setPeriodoEmEscolha(null);
  };

  // Sem "Aplicar", a escolha é desfeita: no "Cancelar", ao desligar o mapa de calor,
  // ao apertar o voltar do Android ou ao sair da aba.
  useEffect(() => {
    if (!mapaCalorAtivo) setPeriodoEmEscolha(null);
  }, [mapaCalorAtivo]);

  useEffect(() => {
    if (!periodoEmEscolha) return undefined;
    const inscricao = BackHandler.addEventListener('hardwareBackPress', () => {
      setPeriodoEmEscolha(null);
      return true;
    });
    return () => inscricao.remove();
  }, [periodoEmEscolha]);

  useFocusEffect(useCallback(() => () => setPeriodoEmEscolha(null), []));

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

  // 1) Onde o mapa abre: última posição salva > última posição do aparelho > Brasil.
  //    Tudo isso é instantâneo; o mapa só é montado depois, já no lugar certo.
  useEffect(() => {
    let ativo = true;
    const carregarCentroInicial = async () => {
      let coords = null;
      try {
        const salvo = await AsyncStorage.getItem(CHAVE_ULTIMA_LOCALIZACAO);
        if (salvo) coords = JSON.parse(salvo);
      } catch {}
      if (!coords) {
        try {
          const { granted } = await Location.getForegroundPermissionsAsync();
          const ultima = granted ? await Location.getLastKnownPositionAsync() : null;
          if (ultima) coords = { latitude: ultima.coords.latitude, longitude: ultima.coords.longitude };
        } catch {}
      }
      if (!ativo) return;
      setCentroInicial(coords
        ? { ...coords, zoom: ZOOM_USUARIO, conhecido: true }
        : { ...REGIAO_PADRAO, zoom: ZOOM_PADRAO, conhecido: false });
    };
    carregarCentroInicial();
    return () => { ativo = false; };
  }, []);

  // 2) Acompanha a posição real do usuário (a primeira leitura chega logo e é refinada depois)
  useEffect(() => {
    let ativo = true;
    let inscricao;
    const atualizar = coords => {
      const nova = { latitude: coords.latitude, longitude: coords.longitude };
      setLocalizacao(nova);
      AsyncStorage.setItem(CHAVE_ULTIMA_LOCALIZACAO, JSON.stringify(nova)).catch(() => {});
    };
    const acompanhar = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !ativo) return;
        const ultima = await Location.getLastKnownPositionAsync().catch(() => null);
        if (ultima && ativo) atualizar(ultima.coords);
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 50 },
          posicao => atualizar(posicao.coords)
        );
        if (ativo) inscricao = sub; else sub.remove();
      } catch (erro) {
        console.error('Erro ao obter localização:', erro);
      }
    };
    acompanhar();
    return () => { ativo = false; inscricao?.remove(); };
  }, []);

  // 3) Centraliza no usuário uma única vez, só se precisar e se ele ainda não mexeu no mapa
  useEffect(() => {
    if (!localizacao || !centroInicial || jaCentralizou.current) return;
    jaCentralizou.current = true;
    if (usuarioMexeuNoMapa.current) return;

    const distancia = distanciaKm(centroInicial, localizacao);
    if (centroInicial.conhecido && distancia < 0.3) return; // já abriu no lugar certo

    const longe = !centroInicial.conhecido || distancia > 30;
    cameraRef.current?.setCamera({
      centerCoordinate: [localizacao.longitude, localizacao.latitude],
      zoomLevel: ZOOM_USUARIO,
      animationMode: longe ? 'flyTo' : 'easeTo',
      animationDuration: longe ? 1600 : 700,
    });
  }, [localizacao, centroInicial]);

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
    } catch {
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

  const normalizarTexto = (texto = '') => 
    texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const alertasFiltrados = useMemo(() => {
    if (filtroAtivo === 'Todos') return alertas;
    
    const filtroNorm = normalizarTexto(filtroAtivo);

    return alertas.filter(item => {
      const tipoNorm = normalizarTexto(item.tipo);
      return tipoNorm.includes(filtroNorm) || filtroNorm.includes(tipoNorm);
    });
  }, [alertas, filtroAtivo]);

  const heatmapGeoJSON = useMemo(() => {
    const filtroNorm = normalizarTexto(filtroAtivo);

    const features = historicoAlertas
      .filter(item => statusEfetivo(item) !== 'rascunho')
      .filter(item => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
      .filter(item => dentroDoPeriodo(item, periodoMapaCalor))
      .filter(item => {
        if (filtroAtivo === 'Todos') return true;
        const tipoNorm = normalizarTexto(item.tipo);
        return tipoNorm.includes(filtroNorm) || filtroNorm.includes(tipoNorm);
      })
      .map(item => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(item.longitude), Number(item.latitude)] },
        properties: { weight: 1 }
      }));
    return { type: 'FeatureCollection', features };
  }, [historicoAlertas, filtroAtivo, periodoMapaCalor]);

  const areasGeoJSON = useMemo(() => {
  const features = alertasFiltrados
    .filter(item => Number.isFinite(Number(item.longitude)) && Number.isFinite(Number(item.latitude)))
    .map(item => {
      const cor = dadosGravidade(item?.gravidade)?.cor || '#1a73e8';
      return gerarCirculoGeoJSON(item.longitude, item.latitude, item.raioMetros, item.id, cor);
    })
    .filter(Boolean);

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

  // Toque no mapa: só o administrador cria ocorrência; para os demais, nada acontece
  const abrirModalMarcacao = evento => {
    if (!administrador) return;
    const [lon, lat] = evento.geometry.coordinates;
    const coords = { latitude: lat, longitude: lon };
    setCoordenadaSelecionada(coords);
    setComentario('');
    setBairro('');
    setFoto(null);
    setTipoSelecionado('Alagamento');
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
    setTipoSelecionado('Alagamento');
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

  const tirarFoto = () => setCameraVisivel(true);

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
      console.error('Erro ao salvar alerta:', erro);
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
      {!centroInicial ? (
        <View style={[styles.map, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={cores.tint} />
        </View>
      ) : (
      <Mapbox.MapView
        style={styles.map}
        scaleBarEnabled={false}
        compassEnabled={false}
        onPress={abrirModalMarcacao}
        onLongPress={abrirModalMarcacao}
        logoEnabled={false}
        attributionEnabled={false}
        styleURL={estiloMapa}
        onCameraChanged={e => {
          if (e.gestures?.isGestureActive) usuarioMexeuNoMapa.current = true;
        }}
        onMapIdle={e => {
          const centro = e.properties?.center;
          if (centro) setRegiaoAtual({ latitude: centro[1], longitude: centro[0] });
        }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [centroInicial.longitude, centroInicial.latitude],
            zoomLevel: centroInicial.zoom,
          }}
        />

        <Mapbox.UserLocation visible={!!localizacao} />

        <Mapbox.ShapeSource id="heatmapSource" shape={heatmapGeoJSON}>
          <Mapbox.HeatmapLayer
            id="heatmapLayer"
            style={{
              visibility: mapaCalorAtivo ? 'visible' : 'none',
              heatmapWeight: ['get', 'weight'],
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

        <Mapbox.ShapeSource id="areasSource" shape={areasGeoJSON}>
          <Mapbox.FillLayer 
            id="areasFill" 
            style={{ 
              visibility: !mapaCalorAtivo ? 'visible' : 'none',
              fillColor: ['get', 'cor'], 
              fillOpacity: 0.15 
            }} 
          />
          <Mapbox.LineLayer 
            id="areasLine" 
            style={{ 
              visibility: !mapaCalorAtivo ? 'visible' : 'none',
              lineColor: ['get', 'cor'], 
              lineWidth: 2 
            }} 
          />
        </Mapbox.ShapeSource>

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
                <Text style={styles.calloutTitle}><IconeTipo tipo={item.tipo} color={cores.tint} /> {item.tipo}</Text>
                <Text style={item.oficial === true ? styles.officialBadge : styles.previousBadge}>{item.oficial === true ? <><Icone nome="check" size={11} /> ALERTA OFICIAL</> : 'REGISTRO ANTERIOR'}</Text>
                <Text style={[styles.severityText, { color: dadosGravidade(item.gravidade).cor }]}><IconeGravidade label={item.gravidade || 'Atenção'} /> {item.gravidade || 'Atenção'} · Área de {formatarRaio(item.raioMetros)}</Text>
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
                <Text escalavel={false} style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>S</Text>
              </View>
              <Mapbox.Callout>
                <View style={{ padding: 8, width: 220 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: cores.textStrong }}>{ponto.nome || 'Ponto seguro'}</Text>
                  <Text style={{ fontSize: 12, color: cores.textMuted, marginVertical: 4 }}>{ponto.categoria || 'Ponto de encontro'} · {ponto.situacao || 'Situação não informada'}</Text>
                  <Text style={{ fontSize: 12, color: cores.textSecondary }}>{ponto.endereco || 'Endereço não informado'}</Text>
                  <TouchableOpacity
                    onPress={() => abrirRotaPontoSeguro(ponto)}
                    style={{ backgroundColor: cores.successButton, padding: 9, borderRadius: 7, marginTop: 8 }}
                  >
                    <Text style={{ color: cores.onButton, fontWeight: '800', textAlign: 'center' }}>Traçar rota até aqui</Text>
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
      )}

      <View
        style={[styles.searchBox, { marginTop: insets.top - 35 }]}
        onLayout={e => {
          const { y, height } = e.nativeEvent.layout;
          setFimBarraSuperior(y + height);
        }}
      >
        <TouchableOpacity style={styles.avatar} onPress={abrirPerfil}><Text style={styles.avatarText}>{iniciais}</Text></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.searchTitle}>Zona de Risco</Text><Text style={styles.searchSub}>{administrador ? 'Modo administrador' : 'Alertas naturais próximos'}</Text></View>
        <TouchableOpacity style={styles.sosHeaderButton} accessibilityLabel="Contatos de emergência" onPress={() => setModalContatosVisivel(true)}><Text style={styles.sosHeaderText}>SOS</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.heatmapHeaderButton, mapaCalorAtivo && styles.heatmapHeaderButtonActive]} accessibilityLabel="Mapa de calor" onPress={() => setMapaCalorAtivo(atual => !atual)}>
          <MaterialCommunityIcons name="fire" size={24} color={cores.icon} />
          </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, fimBarraSuperior !== null ? { top: fimBarraSuperior + ESPACO_FILTROS } : { marginTop: insets.top - 35 }]}
        onLayout={e => {
          const { y, height } = e.nativeEvent.layout;
          setFimFiltros(y + height);
        }}
      >
        {TIPOS_ALERTA.map(tipo => (
          <TouchableOpacity key={tipo.label} onPress={() => setFiltroAtivo(tipo.label)} style={[styles.chip, { flexDirection: 'row', alignItems: 'center', gap: 2 }, filtroAtivo === tipo.label && { backgroundColor: tipo.cor }]}>
            {tipo.renderIcon(filtroAtivo === tipo.label ? '#fff' : cores.textMuted)}
            <Text style={[styles.chipText, filtroAtivo === tipo.label && { color: '#fff' }]}>{tipo.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {(alertaEmergencia || alertasPertoCasa.length > 0 || alertasPertoFamilia.length > 0) && (
        <View style={[styles.avisosTopo, { top: (fimFiltros ?? 172) + 8 }]} pointerEvents="box-none">
          {alertaEmergencia && (
            <TouchableOpacity style={styles.emergencyBanner} onPress={() => setModalEmergenciaVisivel(true)}>
              <Text style={styles.emergencyBannerTitle}><Icone nome="emergencia" size={15} /> EMERGÊNCIA NA SUA ÁREA</Text>
              <Text style={styles.emergencyBannerText}>{alertaEmergencia.tipo}: toque para ver as instruções de evacuação</Text>
            </TouchableOpacity>
          )}
          {alertasPertoCasa.length > 0 ? (
            <TouchableOpacity
              style={styles.homeWarning}
              onPress={() => {
                const alerta = alertasPertoCasa[0];
                cameraRef.current?.setCamera({ centerCoordinate: [alerta.longitude, alerta.latitude], zoomLevel: ZOOM_USUARIO, animationDuration: 700 });
              }}
            >
              <Text style={styles.homeWarningText}><Icone nome="casa" size={14} /> {alertasPertoCasa.length} alerta(s) na área da sua residência</Text>
            </TouchableOpacity>
          ) : alertasPertoFamilia.length > 0 && (
            <TouchableOpacity style={styles.familyWarning} onPress={() => router.push('/familiares')}>
              <Text style={styles.familyWarningText}><Icone nome="pessoas" size={14} /> {alertasPertoFamilia.length} alerta(s) perto de pessoas acompanhadas</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {mapaCalorAtivo ? (
        <View style={styles.heatmapLegend} pointerEvents="box-none">
          <Text style={styles.heatmapLegendTitle}>Concentração histórica</Text>
          <View style={styles.heatmapPeriodos} accessibilityRole="radiogroup" accessibilityLabel="Período do mapa de calor">
            {PERIODOS_MAPA_CALOR.map(periodo => {
              const ativo = periodoMapaCalor === periodo.id;
              return (
                <TouchableOpacity
                  key={periodo.id}
                  onPress={() => escolherPeriodo(periodo.id)}
                  style={[styles.heatmapPeriodoChip, ativo && styles.heatmapPeriodoChipAtivo]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                >
                  <Text style={[styles.heatmapPeriodoTexto, ativo && styles.heatmapPeriodoTextoAtivo]}>{periodo.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {periodoEmEscolha && (
            <View style={styles.heatmapAcoes}>
              <TouchableOpacity style={styles.heatmapCancelar} onPress={() => setPeriodoEmEscolha(null)} accessibilityLabel="Cancelar período">
                <Text style={styles.heatmapCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.heatmapAplicar} onPress={aplicarPeriodo} accessibilityLabel="Aplicar período">
                <Text style={styles.heatmapAplicarTexto}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.heatmapGradient}>
            {['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c'].map(cor => (
              <View key={cor} style={[styles.heatmapColor, { backgroundColor: cor }]} />
            ))}
          </View>
          <View style={styles.heatmapLegendLabels}>
            <Text style={styles.heatmapLegendText}>Menos</Text>
            <Text style={styles.heatmapLegendText}>Mais</Text>
          </View>
          <Text style={styles.heatmapCount}>{heatmapGeoJSON.features.length} ocorrência(s) analisada(s)</Text>
        </View>
      ) : clima && (
        <View style={styles.weatherBox} pointerEvents="none">
          <Text style={styles.weatherTitle}><Icone nome="clima" size={14} /> {clima.descricao} · {Math.round(clima.temperatura)}°C</Text>
          <Text style={styles.weatherText}>Chuva {clima.chuva ?? 0} mm · Vento {Math.round(clima.vento ?? 0)} km/h</Text>
          <Text style={styles.weatherSource}>Open-Meteo · dados auxiliares</Text>
        </View>
      )}

      {alertaSelecionado && (
        <View style={styles.shareAlertBox}>
          <View style={styles.shareAlertInfo}>
            <Text style={styles.shareAlertTitle}>{alertaSelecionado.tipo}</Text>
            <Text style={styles.shareAlertSubtitle}>{alertaSelecionado.bairro || alertaSelecionado.gravidade}</Text>
          </View>
          <TouchableOpacity style={styles.mapWhatsAppButton} onPress={() => compartilharAlertaWhatsApp(alertaSelecionado)}><Text style={styles.mapWhatsAppText}><Icone nome="whatsapp" size={14} /> WhatsApp</Text></TouchableOpacity>
          <TouchableOpacity style={styles.shareAlertClose} onPress={() => setAlertaSelecionado(null)}><Icone nome="fechar" size={16} color={cores.textMuted} escalavel={false} /></TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.locationButton} accessibilityLabel="Centralizar na minha localização" onPress={() => {
        if(localizacao) {
          cameraRef.current?.setCamera({ centerCoordinate: [localizacao.longitude, localizacao.latitude], zoomLevel: 14, animationDuration: 700 });
        }
      }}>
        <FontAwesome name="map-pin" size={24} color={cores.icon} />
      </TouchableOpacity>

      {administrador && (
        <TouchableOpacity style={styles.addButton} accessibilityLabel="Nova ocorrência" onPress={pressionouBotaoAzul}>
          <FontAwesome6 name="plus" size={24} color={cores.icon} />
        </TouchableOpacity>
      )}

      {/* Modal de Nova Ocorrência */}
      <ModalDeslizante
        visivel={modalVisivel}
        onFechar={() => setModalVisivel(false)}
        estiloFundo={styles.modalOverlay}
        estiloPainel={styles.modalBox}
        evitarTeclado
        sobreposto={(
          <CameraCaptura
            visivel={cameraVisivel}
            onFechar={() => setCameraVisivel(false)}
            onFotoTirada={setFoto}
          />
        )}
      >
              <RolagemModal
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
              <View style={styles.dragIndicator} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.modalTitle}>Nova ocorrência</Text>
                <TouchableOpacity onPress={() => setModalVisivel(false)} style={styles.closeButtonMini}><Icone nome="fechar" size={18} color={cores.text} escalavel={false} /></TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Selecione o tipo:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {TIPOS_ALERTA.filter(t => t.label !== 'Todos').map(tipo => (
                  <TouchableOpacity key={tipo.label} onPress={() => setTipoSelecionado(tipo.label)} style={[styles.tipoChip, { flexDirection: 'row', alignItems: 'center' }, tipoSelecionado === tipo.label && { backgroundColor: tipo.cor }]}>
                    {tipo.renderIcon(tipoSelecionado === tipo.label ? '#fff' : cores.textMuted)}
                    <Text style={[styles.tipoText, tipoSelecionado === tipo.label && { color: '#fff' }]}>{tipo.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionLabel}>Nível de risco:</Text>
              <View style={styles.optionRow}>
                {GRAVIDADES.map(item => (
                  <TouchableOpacity key={item.label} onPress={() => setGravidadeSelecionada(item.label)} style={[styles.optionChip, gravidadeSelecionada === item.label && { backgroundColor: item.cor }]}>
                    <Text style={[styles.optionText, gravidadeSelecionada === item.label && styles.optionTextActive]}><IconeGravidade label={item.label} color={gravidadeSelecionada === item.label ? undefined : item.cor} /> {item.label}</Text>
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
                <Text style={styles.guidanceTitle}><Icone nome="escudo" size={15} /> Orientação que será exibida</Text>
                <Text style={styles.guidanceText}>{orientacaoDoRisco(tipoSelecionado)}</Text>
              </View>

              {gravidadeSelecionada === 'Emergência' && (
                <View style={styles.emergencyAdminNotice}>
                  <Text style={styles.emergencyAdminTitle}><Icone nome="emergencia" size={15} /> Este alerta acionará o modo de emergência</Text>
                  <Text style={styles.emergencyAdminText}>Usuários dentro da área receberão instruções de evacuação, checklist e telefones de emergência.</Text>
                </View>
              )}

              <Text style={styles.sectionLabel}>Tempo de permanência no mapa:</Text>
              <View style={styles.tempoRow}>
                <TouchableOpacity onPress={() => setTempoSelecionado(null)} style={[styles.tempoChipOpcao, tempoSelecionado === null && styles.tempoChipAtivo]}>
                  <Text style={[styles.tempoTextoOpcao, tempoSelecionado === null && styles.tempoTextoAtivo]}><Icone nome="raio" size={13} /> Automático ({foto ? '1h' : '30min'})</Text>
                </TouchableOpacity>
                {OPCOES_TEMPO.map(opcao => (
                  <TouchableOpacity key={opcao.label} onPress={() => setTempoSelecionado(opcao.valor)} style={[styles.tempoChipOpcao, tempoSelecionado === opcao.valor && styles.tempoChipAtivo]}>
                    <Text style={[styles.tempoTextoOpcao, tempoSelecionado === opcao.valor && styles.tempoTextoAtivo]}>{opcao.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput style={styles.input} placeholder="Descreva a situação atual..." placeholderTextColor={cores.placeholder} value={comentario} onChangeText={setComentario} multiline />
              <TextInput style={styles.neighborhoodInput} placeholder="Bairro" placeholderTextColor={cores.placeholder} value={bairro} onChangeText={setBairro} />
              {foto && <Image source={{ uri: foto }} style={styles.preview} />}

              <View style={styles.photoRow}>
                <TouchableOpacity style={styles.photoButton} onPress={tirarFoto}><Text style={styles.photoText}><Icone nome="camera" size={15} /> Tirar foto</Text></TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={escolherFoto}><Text style={styles.photoText}><Icone nome="galeria" size={15} /> Galeria</Text></TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisivel(false)} disabled={salvando}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.draftButton]} onPress={() => salvarMarcacao('rascunho')} disabled={salvando}><Text style={styles.draftText}>Salvar rascunho</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={() => salvarMarcacao('ativo')} disabled={salvando}><Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Publicar'}</Text></TouchableOpacity>
              </View>
              </RolagemModal>
      </ModalDeslizante>

      {/* Modal de Contatos de Emergência (SOS) */}
      <ModalDeslizante
        visivel={modalContatosVisivel}
        onFechar={fecharContatos}
        estiloFundo={styles.modalOverlay}
        estiloPainel={styles.modalBox}
      >
            <RolagemModal showsVerticalScrollIndicator={false}>
              <View style={styles.dragIndicator} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={styles.modalTitle}>Contatos de Emergência (SOS)</Text>
                <TouchableOpacity onPress={fecharContatos} style={styles.closeButtonMini}>
                  <Icone nome="fechar" size={18} color={cores.text} escalavel={false} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionLabel, { marginBottom: 15, color: cores.textMuted }]}>
                Em caso de perigo imediato, ligue para os serviços de emergência:
              </Text>

              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: cores.dangerButton, marginBottom: 10, padding: 12, borderRadius: 8 }]} 
                onPress={() => Linking.openURL('tel:193')}
              >
                <Text style={{ color: cores.onButton, fontWeight: 'bold', textAlign: 'center' }}><Icone nome="bombeiros" size={16} /> Bombeiros: 193</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: cores.button, marginBottom: 10, padding: 12, borderRadius: 8 }]} 
                onPress={() => Linking.openURL('tel:199')}
              >
                <Text style={{ color: cores.onButton, fontWeight: 'bold', textAlign: 'center' }}><Icone nome="escudo" size={16} /> Defesa Civil: 199</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#34a853', marginBottom: 20, padding: 12, borderRadius: 8 }]} 
                onPress={() => Linking.openURL('tel:190')}
              >
                <Text style={{ color: cores.onButton, fontWeight: 'bold', textAlign: 'center' }}><Icone nome="policia" size={16} /> Polícia: 190</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={fecharContatos}
              >
                <Text style={styles.cancelText}>Fechar</Text>
              </TouchableOpacity>
            </RolagemModal>
      </ModalDeslizante>

      {/* Modal de Alerta de Emergência Automático (Orientações, Checklist e Contactos) */}
      <ModalDeslizante
        visivel={modalEmergenciaVisivel}
        onFechar={() => setModalEmergenciaVisivel(false)}
        estiloFundo={styles.modalOverlay}
        estiloPainel={styles.modalBox}
      >
            <RolagemModal showsVerticalScrollIndicator={false}>
              <View style={styles.dragIndicator} />
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Icone nome="emergencia" size={24} color={cores.danger} style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTitle, { color: cores.danger }]}>Alerta de emergência</Text>
                </View>
                <TouchableOpacity onPress={() => setModalEmergenciaVisivel(false)} style={styles.closeButtonMini}>
                  <Icone nome="fechar" size={18} color={cores.text} escalavel={false} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 14, fontWeight: 'bold', color: cores.textStrong, marginBottom: 8 }}>
                {alertaEmergencia?.tipo || 'Deslizamento'} na sua área
              </Text>

              <View style={{ backgroundColor: cores.dangerBackground, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ color: cores.dangerStrong, fontWeight: '500' }}>
                  {alertaEmergencia?.comentario || 'Deslizamento de terra'}
                </Text>
              </View>

              <Text style={[styles.sectionLabel, { fontSize: 16, fontWeight: 'bold', color: cores.textStrong, marginBottom: 12 }]}>
                O que fazer agora
              </Text>

              <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: cores.dangerButton, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text escalavel={false} style={{ color: cores.onButton, fontSize: 12, fontWeight: 'bold' }}>1</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: cores.textSecondary, lineHeight: 20 }}>Mantenha a calma e siga as orientações das autoridades.</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: cores.dangerButton, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text escalavel={false} style={{ color: cores.onButton, fontSize: 12, fontWeight: 'bold' }}>2</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: cores.textSecondary, lineHeight: 20 }}>Saia pela rota segura; não atravesse água, fumaça ou área interditada.</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: cores.dangerButton, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text escalavel={false} style={{ color: cores.onButton, fontSize: 12, fontWeight: 'bold' }}>3</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: cores.textSecondary, lineHeight: 20 }}>Se houver tempo e segurança, desligue energia e gás antes de sair.</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: cores.dangerButton, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text escalavel={false} style={{ color: cores.onButton, fontSize: 12, fontWeight: 'bold' }}>4</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: cores.textSecondary, lineHeight: 20 }}>Ajude crianças, idosos, pessoas com deficiência e animais.</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: cores.dangerButton, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text escalavel={false} style={{ color: cores.onButton, fontSize: 12, fontWeight: 'bold' }}>5</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: cores.textSecondary, lineHeight: 20 }}>Vá para um abrigo ou ponto seguro indicado no aplicativo.</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: cores.dangerButton, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 }}>
                  <Text escalavel={false} style={{ color: cores.onButton, fontSize: 12, fontWeight: 'bold' }}>6</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: cores.textSecondary, lineHeight: 20 }}>Não volte ao local até a liberação oficial.</Text>
              </View>

              <Text style={[styles.sectionLabel, { fontSize: 16, fontWeight: 'bold', color: cores.textStrong, marginBottom: 12 }]}>
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
                  <Icone nome="checkbox" size={18} color={cores.text} style={{ marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 14, color: cores.textSecondary }}>{item}</Text>
                </View>
              ))}

              <Text style={[styles.sectionLabel, { fontSize: 16, fontWeight: 'bold', color: cores.textStrong, marginTop: 12, marginBottom: 12 }]}>
                Contatos de emergência
              </Text>

              <TouchableOpacity 
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: cores.surfaceSubtle, padding: 12, borderRadius: 8, marginBottom: 8 }}
                onPress={() => Linking.openURL('tel:199')}
              >
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: cores.textStrong }}><Icone nome="escudo" size={15} /> Defesa Civil</Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: cores.danger }}>Ligar 199</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: cores.surfaceSubtle, padding: 12, borderRadius: 8, marginBottom: 8 }}
                onPress={() => Linking.openURL('tel:193')}
              >
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: cores.textStrong }}><Icone nome="bombeiros" size={15} /> Bombeiros</Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: cores.danger }}>Ligar 193</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: cores.surfaceSubtle, padding: 12, borderRadius: 8, marginBottom: 12 }}
                onPress={() => Linking.openURL('tel:192')}
              >
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: cores.textStrong }}><Icone nome="ambulancia" size={15} /> SAMU</Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: cores.danger }}>Ligar 192</Text>
              </TouchableOpacity>

              <View style={{ backgroundColor: cores.tintBackground, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: cores.tint }}>
                  <Icone nome="celular" size={13} /> Estas instruções ficam disponíveis no aplicativo mesmo sem internet.
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: cores.button, padding: 14, borderRadius: 8, marginBottom: 10 }]} 
                onPress={() => {
                  setModalEmergenciaVisivel(false);
                  router.push('/abrigos');
                }}
              >
                <Text style={{ color: cores.onButton, fontWeight: 'bold', textAlign: 'center', fontSize: 15 }}>
                  <Icone nome="casa" size={15} /> Ver abrigos e pontos seguros
                </Text>
              </TouchableOpacity>
            </RolagemModal>
      </ModalDeslizante>

    </View>
  );
}
