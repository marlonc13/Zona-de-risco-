import { ActivityIndicator, Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import app, { auth } from '../../services/firebaseConfig';
import { observarStatusAdministrador } from '../../services/accessControl';
import { dadosGravidade, formatarRaio, orientacaoDoRisco } from '../../services/riskGuidance';
import styles from '../../styles/ocorrencia.styles';
import { STATUS_ALERTA, dadosStatus, statusEfetivo } from '../../services/alertLifecycle';
import { compartilharAlertaWhatsApp } from '../../services/shareAlert';

const db = getFirestore(app);

const EMOJIS = {
  Alagamento: '🌊', Enchente: '🌧️', Deslizamento: '⛰️', Vendaval: '🌪️',
  Seca: '☀️', 'Incêndio florestal': '🔥',
};

function formatarData(valor) {
  if (!valor) return 'Não informado';
  return new Date(valor).toLocaleString('pt-BR');
}

export default function OcorrenciaDetalhes() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [ocorrencia, setOcorrencia] = useState(null);
  const [carregando, setCarregando] = useState(true);
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
    if (!id || Array.isArray(id)) return undefined;
    return onSnapshot(doc(db, 'marcacoes', id), snapshot => {
      setOcorrencia(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      setCarregando(false);
    }, erro => {
      console.error('Erro ao abrir ocorrência:', erro);
      setCarregando(false);
    });
  }, [id]);

  if (carregando) return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  if (!ocorrencia) return <View style={styles.center}><Text style={styles.notFound}>Esta ocorrência não foi encontrada ou foi excluída.</Text><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backButtonText}>Voltar</Text></TouchableOpacity></View>;

  const gravidade = dadosGravidade(ocorrencia.gravidade);
  const statusAtual = statusEfetivo(ocorrencia);
  const statusDados = dadosStatus(statusAtual);
  const indiceStatus = STATUS_ALERTA.findIndex(item => item.id === statusAtual);
  const coordenada = { latitude: ocorrencia.latitude, longitude: ocorrencia.longitude };
  const possuiCoordenadas = Number.isFinite(coordenada.latitude) && Number.isFinite(coordenada.longitude);

  const abrirRota = () => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${coordenada.latitude},${coordenada.longitude}`);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}><Text style={styles.iconButtonText}>‹</Text></TouchableOpacity>
        <Text style={styles.topTitle}>Detalhes da ocorrência</Text>
        <TouchableOpacity accessibilityLabel="Compartilhar alerta pelo WhatsApp" style={[styles.iconButton, styles.shareIconButton]} onPress={() => compartilharAlertaWhatsApp(ocorrencia)}><Text style={styles.shareIconText}>↗</Text></TouchableOpacity>
      </View>

      {ocorrencia.fotoUrl ? <Image source={{ uri: ocorrencia.fotoUrl }} style={styles.heroImage} /> : <View style={styles.heroPlaceholder}><Text style={styles.heroEmoji}>{EMOJIS[ocorrencia.tipo] || '📍'}</Text><Text style={styles.heroPlaceholderText}>Sem foto anexada</Text></View>}

      <View style={styles.mainCard}>
        <View style={styles.badges}>
          <Text style={[styles.statusBadge, { color: statusDados.cor, backgroundColor: statusDados.fundo }]}>{statusDados.emoji} {statusDados.label.toUpperCase()}</Text>
          <Text style={styles.officialBadge}>{ocorrencia.oficial === true ? '✓ ALERTA OFICIAL' : 'REGISTRO ANTERIOR'}</Text>
        </View>
        <Text style={styles.type}>{EMOJIS[ocorrencia.tipo] || '📍'} {ocorrencia.tipo}</Text>
        <Text style={[styles.severity, { color: gravidade.cor }]}>{gravidade.emoji} {ocorrencia.gravidade || 'Atenção'}</Text>
        <Text style={styles.description}>{ocorrencia.comentario}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ciclo de vida da ocorrência</Text>
        <Text style={styles.lifecycleHelp}>A situação é atualizada pelos administradores conforme o risco evolui.</Text>
        {STATUS_ALERTA.map((item, indice) => {
          const atual = item.id === statusAtual;
          const concluido = indice < indiceStatus;
          return <View key={item.id} style={styles.lifecycleItem}>
            <View style={[styles.lifecycleDot, { backgroundColor: atual || concluido ? item.cor : '#dadce0' }]}><Text style={styles.lifecycleDotText}>{concluido ? '✓' : item.emoji}</Text></View>
            <View style={{ flex: 1 }}><Text style={[styles.lifecycleLabel, atual && { color: item.cor }]}>{item.label}</Text>{atual && <Text style={styles.lifecycleCurrent}>Estado atual</Text>}</View>
          </View>;
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações do alerta</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Bairro</Text><Text style={styles.detailValue}>{ocorrencia.bairro || 'Não informado'}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Área afetada</Text><Text style={styles.detailValue}>{formatarRaio(ocorrencia.raioMetros)}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Publicado</Text><Text style={styles.detailValue}>{formatarData(ocorrencia.createdAtMillis)}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Última atualização</Text><Text style={styles.detailValue}>{formatarData(ocorrencia.updatedAtMillis)}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Expiração prevista</Text><Text style={styles.detailValue}>{formatarData(ocorrencia.expiresAt)}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Responsável</Text><Text style={styles.detailValue}>{ocorrencia.userName || ocorrencia.adminEmail || 'Administrador'}</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Histórico administrativo</Text>
        {(ocorrencia.historicoAdministrativo || []).length ? [...ocorrencia.historicoAdministrativo]
          .sort((a, b) => (b.dataMillis || 0) - (a.dataMillis || 0))
          .map((registro, indice) => (
            <View key={`${registro.dataMillis}-${indice}`} style={styles.auditItem}>
              <View style={styles.auditDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.auditAction}>{registro.acao}</Text>
                <Text style={styles.auditAdmin}>{registro.adminNome || 'Administrador'} · {registro.adminEmail || 'E-mail não informado'}</Text>
                <Text style={styles.auditDate}>{formatarData(registro.dataMillis)}</Text>
              </View>
            </View>
          )) : <Text style={styles.legacyAudit}>Registro antigo: responsável informado como {ocorrencia.adminEmail || ocorrencia.userName || 'não identificado'}.</Text>}
      </View>

      <View style={styles.guidanceBox}>
        <Text style={styles.guidanceTitle}>🛡️ Como se proteger</Text>
        <Text style={styles.guidanceText}>{orientacaoDoRisco(ocorrencia.tipo)}</Text>
        {ocorrencia.gravidade === 'Emergência' && <TouchableOpacity style={styles.shelterLink} onPress={() => router.push('/abrigos')}><Text style={styles.shelterLinkText}>🏠 Ver abrigos e pontos seguros</Text></TouchableOpacity>}
      </View>

      {possuiCoordenadas && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localização e área afetada</Text>
          <MapView provider={PROVIDER_GOOGLE} style={styles.map} initialRegion={{ ...coordenada, latitudeDelta: 0.025, longitudeDelta: 0.025 }} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}>
            <Circle center={coordenada} radius={ocorrencia.raioMetros || 1000} fillColor={`${gravidade.cor}30`} strokeColor={gravidade.cor} strokeWidth={2} />
            <Marker coordinate={coordenada} pinColor={gravidade.cor} />
          </MapView>
          <Text style={styles.coordinates}>Lat. {coordenada.latitude.toFixed(5)} · Long. {coordenada.longitude.toFixed(5)}</Text>
          <TouchableOpacity style={styles.routeButton} onPress={abrirRota}><Text style={styles.routeButtonText}>🧭 Abrir rota no Google Maps</Text></TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.whatsappButton} onPress={() => compartilharAlertaWhatsApp(ocorrencia)}>
        <Text style={styles.whatsappButtonText}>💬 Compartilhar alerta pelo WhatsApp</Text>
      </TouchableOpacity>

      {administrador && <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/lista')}><Text style={styles.adminButtonText}>⚙️ Gerenciar esta ocorrência</Text></TouchableOpacity>}
    </ScrollView>
  );
}
