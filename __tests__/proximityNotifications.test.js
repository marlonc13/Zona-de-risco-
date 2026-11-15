// Os jest.mock abaixo são executados antes dos imports (o Jest os move para o topo)
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { avisarAlertasProximos, distanciaKm } from '../services/proximityNotifications';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
// Simula um development build (no Expo Go as notificações ficam desligadas)
jest.mock('expo-constants', () => ({ __esModule: true, default: { appOwnership: null } }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

// Praça da Sé (SP) como referência; 0,009° de latitude ≈ 1 km
const CENTRO = { latitude: -23.5505, longitude: -46.6333 };
const aKm = km => ({ latitude: CENTRO.latitude + km * 0.009, longitude: CENTRO.longitude });

const alerta = (id, km, extra = {}) => ({
  id,
  tipo: 'Alagamento',
  gravidade: 'Alerta',
  comentario: 'Rua alagada',
  raioMetros: 1000,
  ...aKm(km),
  ...extra,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  Notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
});

describe('distanciaKm', () => {
  it('é zero para o mesmo ponto', () => {
    expect(distanciaKm(CENTRO, CENTRO)).toBe(0);
  });

  it('calcula a distância real entre São Paulo e Rio de Janeiro (~360 km)', () => {
    const rio = { latitude: -22.9068, longitude: -43.1729 };
    expect(distanciaKm(CENTRO, rio)).toBeGreaterThan(350);
    expect(distanciaKm(CENTRO, rio)).toBeLessThan(365);
  });

  it('é simétrica', () => {
    const outro = aKm(3);
    expect(distanciaKm(CENTRO, outro)).toBeCloseTo(distanciaKm(outro, CENTRO), 10);
  });
});

describe('avisarAlertasProximos', () => {
  it('avisa sobre alerta dentro do raio da localização atual', async () => {
    await avisarAlertasProximos(CENTRO, [alerta('a1', 0.5)]);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const { content } = Notifications.scheduleNotificationAsync.mock.calls[0][0];
    expect(content.title).toBe('Alerta: Alagamento');
    expect(content.body).toContain('da sua localização');
    expect(content.data).toEqual({ alertaId: 'a1' });
  });

  it('não avisa sobre alerta fora do raio', async () => {
    await avisarAlertasProximos(CENTRO, [alerta('a1', 2)]);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('usa 1 km como raio quando o alerta não informa', async () => {
    await avisarAlertasProximos(CENTRO, [alerta('perto', 0.8, { raioMetros: undefined }), alerta('longe', 1.5, { raioMetros: undefined })]);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync.mock.calls[0][0].content.data.alertaId).toBe('perto');
  });

  it('não repete o aviso do mesmo alerta', async () => {
    await avisarAlertasProximos(CENTRO, [alerta('a1', 0.5)]);
    await avisarAlertasProximos(CENTRO, [alerta('a1', 0.5)]);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('avisa pelo endereço da residência quando o usuário está longe', async () => {
    const longeDeCasa = aKm(20);
    await avisarAlertasProximos(longeDeCasa, [alerta('a1', 0.3)], CENTRO);
    expect(Notifications.scheduleNotificationAsync.mock.calls[0][0].content.body).toContain('da sua residência');
  });

  it('avisa pelo endereço de um familiar, citando o nome', async () => {
    const familiar = { ...CENTRO, nome: 'Maria' };
    await avisarAlertasProximos(null, [alerta('a1', 0.3)], null, [familiar]);
    expect(Notifications.scheduleNotificationAsync.mock.calls[0][0].content.body).toContain('do endereço de Maria');
  });

  it('não faz nada sem nenhum local de referência ou sem alertas', async () => {
    await avisarAlertasProximos(null, [alerta('a1', 0)]);
    await avisarAlertasProximos(CENTRO, []);
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('não avisa quando o usuário nega a permissão de notificação', async () => {
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
    Notifications.requestPermissionsAsync.mockResolvedValue({ granted: false });
    await avisarAlertasProximos(CENTRO, [alerta('a1', 0.5)]);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('guarda no máximo os 100 últimos alertas avisados', async () => {
    const antigos = Array.from({ length: 100 }, (_, i) => `antigo-${i}`);
    await AsyncStorage.setItem('alertasNotificados', JSON.stringify(antigos));

    await avisarAlertasProximos(CENTRO, [alerta('novo', 0.2)]);

    const salvos = JSON.parse(await AsyncStorage.getItem('alertasNotificados'));
    expect(salvos).toHaveLength(100);
    expect(salvos[salvos.length - 1]).toBe('novo');
    expect(salvos).not.toContain('antigo-0');
  });
});
