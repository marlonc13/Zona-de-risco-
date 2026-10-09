import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { collection, getFirestore, onSnapshot } from 'firebase/firestore';
import Mapbox from '@rnmapbox/maps';
import app from '../../services/firebaseConfig';
import { statusEfetivo } from '../../services/alertLifecycle';
import styles from '../../styles/estatisticas.styles';

const db = getFirestore(app);
const TIPOS = ['Alagamento', 'Enchente', 'Deslizamento', 'Vendaval', 'Seca', 'Incêndio florestal'];
const GRAVIDADES = ['Atenção', 'Alerta', 'Emergência'];

function contarPor(lista, campo, opcoes = null) {
  const contagem = lista.reduce((acc, item) => {
    const chave = item[campo] || 'Não informado';
    acc[chave] = (acc[chave] || 0) + 1;
    return acc;
  }, {});
  const itens = opcoes ? opcoes.map(nome => ({ nome, total: contagem[nome] || 0 })) : Object.entries(contagem).map(([nome, total]) => ({ nome, total }));
  return itens.sort((a, b) => b.total - a.total);
}

function Barra({ nome, total, maximo, cor = '#1a73e8' }) {
  const largura = total === 0 || maximo === 0 ? 0 : Math.max(5, (total / maximo) * 100);
  return <View style={styles.barItem}>
    <View style={styles.barHeader}><Text style={styles.barLabel}>{nome}</Text><Text style={styles.barValue}>{total}</Text></View>
    <View style={styles.barTrack}><View style={[styles.barFill, { width: `${largura}%`, backgroundColor: cor }]} /></View>
  </View>;
}

export default function EstatisticasPublicas() {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => onSnapshot(collection(db, 'marcacoes'), snapshot => {
    const publicadas = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => statusEfetivo(item) !== 'rascunho');
    setOcorrencias(publicadas);
    setCarregando(false);
  }, erro => {
    console.error('Erro ao carregar estatísticas públicas:', erro);
    setCarregando(false);
  }), []);

  const dados = useMemo(() => {
    const agora = Date.now();
    const trintaDias = 30 * 24 * 60 * 60 * 1000;
    const ativas = ocorrencias.filter(item => ['ativo', 'monitoramento'].includes(statusEfetivo(item))).length;
    const encerradas = ocorrencias.filter(item => statusEfetivo(item) === 'encerrado').length;
    const emergencias = ocorrencias.filter(item => item.gravidade === 'Emergência').length;
    const recentes = ocorrencias.filter(item => agora - (item.createdAtMillis || 0) <= trintaDias).length;
    const tipos = contarPor(ocorrencias, 'tipo', TIPOS);
    const gravidades = contarPor(ocorrencias, 'gravidade', GRAVIDADES);
    const bairros = contarPor(ocorrencias.filter(item => item.bairro), 'bairro').slice(0, 5);
    return { ativas, encerradas, emergencias, recentes, tipos, gravidades, bairros };
  }, [ocorrencias]);

const heatmapGeoJSON = useMemo(() => {
    const features = ocorrencias
      .filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
      .map(item => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [item.longitude, item.latitude] },
        properties: { weight: 1 }
      }));
    return { type: 'FeatureCollection', features };
  }, [ocorrencias]);

  // Cálculo do centro da câmera do mapa baseado na média das coordenadas
  const centroMapa = useMemo(() => {
    if (!heatmapGeoJSON.features.length) return [-43.82, -22.47]; // Padrão: Vassouras
    const longitude = heatmapGeoJSON.features.reduce((total, p) => total + p.geometry.coordinates[0], 0) / heatmapGeoJSON.features.length;
    const latitude = heatmapGeoJSON.features.reduce((total, p) => total + p.geometry.coordinates[1], 0) / heatmapGeoJSON.features.length;
    return [longitude, latitude];
  }, [heatmapGeoJSON]);

  if (carregando) return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /><Text style={styles.loading}>Carregando estatísticas...</Text></View>;

  const maiorTipo = Math.max(1, ...dados.tipos.map(item => item.total));
  const maiorGravidade = Math.max(1, ...dados.gravidades.map(item => item.total));
  const maiorBairro = Math.max(1, ...dados.bairros.map(item => item.total));

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Estatísticas públicas</Text>
    <Text style={styles.subtitle}>Visão geral das ocorrências naturais registradas. Este painel não exibe nomes, e-mails nem outras informações pessoais.</Text>

    <View style={styles.summaryGrid}>
      <View style={[styles.summaryCard, styles.blueCard]}><Text style={styles.summaryNumber}>{ocorrencias.length}</Text><Text style={styles.summaryLabel}>Ocorrências registradas</Text></View>
      <View style={[styles.summaryCard, styles.greenCard]}><Text style={styles.summaryNumber}>{dados.ativas}</Text><Text style={styles.summaryLabel}>Alertas ativos</Text></View>
      <View style={[styles.summaryCard, styles.redCard]}><Text style={styles.summaryNumber}>{dados.emergencias}</Text><Text style={styles.summaryLabel}>Emergências registradas</Text></View>
      <View style={[styles.summaryCard, styles.grayCard]}><Text style={styles.summaryNumber}>{dados.encerradas}</Text><Text style={styles.summaryLabel}>Ocorrências encerradas</Text></View>
    </View>

    <View style={styles.recentBox}><Text style={styles.recentNumber}>{dados.recentes}</Text><View style={{ flex: 1 }}><Text style={styles.recentTitle}>Ocorrências nos últimos 30 dias</Text><Text style={styles.recentText}>Contagem atualizada automaticamente pelos registros públicos.</Text></View></View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mapa de calor histórico</Text>
      <Text style={styles.mapHelp}>As cores mostram onde existe maior concentração de ocorrências publicadas.</Text>
      
      {heatmapGeoJSON.features.length ? <>
        <Mapbox.MapView 
          style={styles.heatmap} 
          scrollEnabled={false} 
          zoomEnabled={false} 
          rotateEnabled={false} 
          pitchEnabled={false}
          logoEnabled={false}
          attributionEnabled={false}
          styleURL="mapbox://styles/mapbox/streets-v12"
        >
          <Mapbox.Camera
            defaultSettings={{
              centerCoordinate: centroMapa,
              zoomLevel: 8.5,
            }}
          />
          <Mapbox.ShapeSource id="statsHeatmapSource" shape={heatmapGeoJSON}>
            <Mapbox.HeatmapLayer
              id="statsHeatmapLayer"
              style={{
                heatmapWeight: 1,
                heatmapIntensity: 1,
                heatmapRadius: 40,
                heatmapOpacity: 0.8,
                heatmapColor: [
                  'interpolate', ['linear'], ['heatmap-density'],
                  0, 'rgba(33,102,172,0)',
                  0.25, '#abdda4',
                  0.5, '#ffffbf',
                  0.75, '#fdae61',
                  1, '#d7191c'
                ]
              }}
            />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>
        <View style={styles.mapGradient}><View style={[styles.mapColor, { backgroundColor: '#2b83ba' }]} /><View style={[styles.mapColor, { backgroundColor: '#abdda4' }]} /><View style={[styles.mapColor, { backgroundColor: '#ffffbf' }]} /><View style={[styles.mapColor, { backgroundColor: '#fdae61' }]} /><View style={[styles.mapColor, { backgroundColor: '#d7191c' }]} /></View>
        <View style={styles.mapLegendLabels}><Text style={styles.mapLegendText}>Menor concentração</Text><Text style={styles.mapLegendText}>Maior concentração</Text></View>
        <Text style={styles.mapCount}>{heatmapGeoJSON.features.length} ocorrência(s) analisada(s)</Text>
      </> : <Text style={styles.empty}>Ainda não existem ocorrências com localização para montar o mapa.</Text>}
    </View>

    <View style={styles.section}><Text style={styles.sectionTitle}>Ocorrências por tipo</Text>{dados.tipos.map(item => <Barra key={item.nome} {...item} maximo={maiorTipo} />)}</View>
    <View style={styles.section}><Text style={styles.sectionTitle}>Ocorrências por gravidade</Text>{dados.gravidades.map(item => <Barra key={item.nome} {...item} maximo={maiorGravidade} cor={{ Atenção: '#f9ab00', Alerta: '#e8710a', Emergência: '#d93025' }[item.nome]} />)}</View>
    <View style={styles.section}><Text style={styles.sectionTitle}>Bairros com mais registros</Text>{dados.bairros.length ? dados.bairros.map(item => <Barra key={item.nome} {...item} maximo={maiorBairro} cor="#7b1fa2" />) : <Text style={styles.empty}>Ainda não há bairros informados.</Text>}</View>

    <View style={styles.privacyBox}><Text style={styles.privacyTitle}>🔒 Painel somente para consulta</Text><Text style={styles.privacyText}>Usuários e visitantes não podem editar estes dados. Informações de administradores e moradores não aparecem nesta tela.</Text></View>
  </ScrollView>;
}