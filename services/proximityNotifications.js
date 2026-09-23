import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const RAIO_ALERTA_KM = 5;
const estaNoExpoGo = Constants.appOwnership === 'expo';
let notificacoesConfiguradas = false;

async function carregarNotificacoes() {
  // O Expo Go não oferece notificações Android a partir do SDK 53.
  // Em um development build, o módulo é carregado e funciona normalmente.
  if (estaNoExpoGo) return null;

  const Notifications = await import('expo-notifications');
  if (!notificacoesConfiguradas) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificacoesConfiguradas = true;
  }
  return Notifications;
}

function distanciaKm(origem, destino) {
  const rad = valor => (valor * Math.PI) / 180;
  const raioTerra = 6371;
  const dLat = rad(destino.latitude - origem.latitude);
  const dLon = rad(destino.longitude - origem.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(origem.latitude)) * Math.cos(rad(destino.latitude))
    * Math.sin(dLon / 2) ** 2;
  return raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function solicitarPermissaoNotificacoes() {
  const Notifications = await carregarNotificacoes();
  if (!Notifications) return false;

  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  const resposta = await Notifications.requestPermissionsAsync();
  return resposta.granted;
}

export async function avisarAlertasProximos(localizacao, alertas) {
  if (!localizacao || !alertas.length) return;

  const Notifications = await carregarNotificacoes();
  if (!Notifications) return;

  const permitido = await solicitarPermissaoNotificacoes();
  if (!permitido) return;

  const idsAvisados = JSON.parse(await AsyncStorage.getItem('alertasNotificados') || '[]');
  const novosIds = [...idsAvisados];

  for (const alerta of alertas) {
    if (idsAvisados.includes(alerta.id)) continue;
    const distancia = distanciaKm(localizacao, alerta);
    if (distancia <= RAIO_ALERTA_KM) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${alerta.tipo} próximo de você`,
          body: `${alerta.comentario} (${distancia.toFixed(1)} km)`,
          data: { alertaId: alerta.id },
        },
        trigger: null,
      });
      novosIds.push(alerta.id);
    }
  }

  await AsyncStorage.setItem('alertasNotificados', JSON.stringify(novosIds.slice(-100)));
}
