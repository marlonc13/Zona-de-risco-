import { Alert, Linking, Platform } from 'react-native';
import { dadosStatus, statusEfetivo } from './alertLifecycle';

export function montarTextoAlerta(alerta) {
  const status = dadosStatus(statusEfetivo(alerta)).label;
  const local = alerta.bairro ? `Bairro: ${alerta.bairro}` : 'Local não informado';
  const mapa = Number.isFinite(alerta.latitude) && Number.isFinite(alerta.longitude)
    ? `https://www.google.com/maps/search/?api=1&query=${alerta.latitude},${alerta.longitude}`
    : '';

  return [
    `⚠️ ALERTA — ${alerta.tipo || 'Risco natural'}`,
    `Gravidade: ${alerta.gravidade || 'Atenção'}`,
    `Situação: ${status}`,
    local,
    alerta.comentario || '',
    mapa ? `Ver localização: ${mapa}` : '',
    'Fonte: aplicativo Zona de Risco',
  ].filter(Boolean).join('\n');
}

export async function compartilharAlertaWhatsApp(alerta) {
  const texto = montarTextoAlerta(alerta);
  const textoCodificado = encodeURIComponent(texto);
  const aplicativo = `whatsapp://send?text=${textoCodificado}`;
  const navegador = `https://wa.me/?text=${textoCodificado}`;

  try {
    if (Platform.OS === 'web') {
      await Linking.openURL(navegador);
      return;
    }

    // Abrir diretamente é mais confiável que canOpenURL no Expo Go,
    // que pode responder false mesmo com o WhatsApp instalado.
    await Linking.openURL(aplicativo);
  } catch (erro) {
    console.warn('Não foi possível usar o link direto do WhatsApp:', erro);
    try {
      await Linking.openURL(navegador);
    } catch (erroNavegador) {
      console.error('Erro ao compartilhar alerta:', erroNavegador);
      Alert.alert('Não foi possível abrir o WhatsApp', 'Verifique se o aplicativo está instalado e tente novamente.');
    }
  }
}
