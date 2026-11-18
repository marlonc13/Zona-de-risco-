import { Alert, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { addDoc, onSnapshot } from 'firebase/firestore';
import MapScreen from '../../app/(tabs)/mapa';

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockUsuario = { uid: 'uid-admin', email: 'admin@exemplo.com', displayName: 'Admin' };

// useFocusEffect vira um efeito comum: a tela "perde o foco" quando é desmontada
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  useFocusEffect: efeito => require('react').useEffect(efeito, [efeito]),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Mapbox é nativo: cada componente vira uma View que só repassa os filhos
jest.mock('@rnmapbox/maps', () => {
  const { View } = require('react-native');
  const Componente = ({ children }) => <View>{children}</View>;
  return {
    __esModule: true,
    default: {
      setAccessToken: jest.fn(),
      MapView: Componente, Camera: () => null, UserLocation: () => null, ShapeSource: Componente,
      HeatmapLayer: () => null, FillLayer: () => null, LineLayer: () => null,
      PointAnnotation: Componente, Callout: Componente,
    },
  };
});
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4 },
  getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'denied' })),
  getLastKnownPositionAsync: jest.fn(() => Promise.resolve(null)),
  watchPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([{ district: 'Centro' }])),
}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: mockUsuario })),
  onAuthStateChanged: jest.fn((_auth, callback) => { callback(mockUsuario); return jest.fn(); }),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn((_db, nome) => nome),
  doc: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'novo' })),
  serverTimestamp: jest.fn(() => 'agora'),
  onSnapshot: jest.fn((_ref, callback) => { callback({ docs: [], data: () => undefined }); return jest.fn(); }),
}));
jest.mock('../../services/firebaseConfig', () => ({ __esModule: true, default: {} }));
jest.mock('../../services/accessControl', () => ({
  isAdminUser: jest.fn(() => true),
  observarStatusAdministrador: jest.fn((_user, callback) => { callback(true); return jest.fn(); }),
}));
jest.mock('../../services/proximityNotifications', () => ({
  avisarAlertasProximos: jest.fn(() => Promise.resolve()),
  distanciaKm: jest.fn(() => 999),
}));
jest.mock('../../services/weatherService', () => ({ buscarClimaAtual: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../services/imageUpload', () => ({ uploadImage: jest.fn() }));
jest.mock('../../services/shareAlert', () => ({ compartilharAlertaWhatsApp: jest.fn() }));
jest.mock('../../components/camera-captura', () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

async function abrirNovaOcorrencia() {
  render(<MapScreen />);
  fireEvent.press(await screen.findByLabelText('Nova ocorrência'));
  await screen.findByText('Nível de risco:');
}

function preencherDescricao() {
  fireEvent.changeText(screen.getByPlaceholderText('Descreva a situação atual...'), 'Rua alagada perto da escola');
  fireEvent.changeText(screen.getByPlaceholderText('Bairro'), 'Centro');
}

it('oferece as três gravidades, a duração e o rascunho', async () => {
  await abrirNovaOcorrencia();
  for (const gravidade of ['Atenção', 'Alerta', 'Emergência']) {
    expect(screen.getByText(new RegExp(`${gravidade}$`))).toBeTruthy();
  }
  expect(screen.getByText('Tempo de permanência no mapa:')).toBeTruthy();
  expect(screen.getByText('Salvar rascunho')).toBeTruthy();
  expect(screen.getByText('Publicar')).toBeTruthy();
});

it('avisa o administrador quando o alerta vai acionar o modo de emergência', async () => {
  await abrirNovaOcorrencia();
  expect(screen.queryByText(/acionará o modo de emergência/)).toBeNull();
  fireEvent.press(screen.getByText(/Emergência$/));
  expect(screen.getByText(/acionará o modo de emergência/)).toBeTruthy();
});

it('publica com a gravidade escolhida', async () => {
  await abrirNovaOcorrencia();
  fireEvent.press(screen.getByText(/Emergência$/));
  preencherDescricao();
  await act(async () => { fireEvent.press(screen.getByText('Publicar')); });

  await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
  const [, dados] = addDoc.mock.calls[0];
  expect(dados).toMatchObject({ gravidade: 'Emergência', status: 'ativo', oficial: true, bairro: 'Centro' });
  expect(dados.expiresAt).toBeGreaterThan(Date.now());
});

it('salva como rascunho, sem publicar no mapa', async () => {
  await abrirNovaOcorrencia();
  preencherDescricao();
  await act(async () => { fireEvent.press(screen.getByText('Salvar rascunho')); });

  await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
  const [, dados] = addDoc.mock.calls[0];
  expect(dados).toMatchObject({ status: 'rascunho', oficial: false, expiresAt: null, gravidade: 'Atenção' });
});

it('não publica sem descrição', async () => {
  await abrirNovaOcorrencia();
  await act(async () => { fireEvent.press(screen.getByText('Publicar')); });
  expect(addDoc).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Aviso', 'Escreva uma breve descrição do problema.');
});

describe('mapa de calor', () => {
  const UM_DIA = 24 * 60 * 60 * 1000;
  const ocorrencia = (id, dias, extra = {}) => ({
    id,
    data: () => ({ tipo: 'Alagamento', latitude: -23.5, longitude: -46.6, status: 'encerrado', createdAtMillis: Date.now() - dias * UM_DIA, ...extra }),
  });
  const historico = [
    ocorrencia('a', 2),
    ocorrencia('b', 20),
    ocorrencia('c', 200),
    ocorrencia('d', 3, { tipo: 'Deslizamento' }),
    ocorrencia('e', 1, { status: 'rascunho' }),
    ocorrencia('f', 0.5),
  ];
  const contador = total => screen.getByText(`${total} ocorrência(s) analisada(s)`);

  beforeEach(async () => {
    await AsyncStorage.clear();
    onSnapshot.mockImplementation((ref, callback) => {
      callback({ docs: ref === 'marcacoes' ? historico : [], data: () => undefined });
      return jest.fn();
    });
  });

  async function abrirMapaDeCalor() {
    const tela = render(<MapScreen />);
    fireEvent.press(await screen.findByLabelText('Mapa de calor'));
    return tela;
  }

  function capturarVoltar() {
    const handlers = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_evento, handler) => {
      handlers.push(handler);
      return { remove: () => handlers.splice(handlers.indexOf(handler), 1) };
    });
    return () => handlers.at(-1)?.();
  }

  it('só mostra os períodos com o mapa de calor ligado', async () => {
    render(<MapScreen />);
    await screen.findByLabelText('Mapa de calor');
    expect(screen.queryByText('Último mês')).toBeNull();
    fireEvent.press(screen.getByLabelText('Mapa de calor'));
    for (const periodo of ['Tudo', 'Último mês', 'Última semana', 'Últimas 24 horas']) {
      expect(screen.getByText(periodo)).toBeTruthy();
    }
  });

  it('começa no último mês, ignora rascunhos e não pede confirmação', async () => {
    await abrirMapaDeCalor();
    expect(contador(4)).toBeTruthy();
    expect(screen.queryByText('Aplicar')).toBeNull();
  });

  it('mostra a prévia de cada período antes da confirmação', async () => {
    await abrirMapaDeCalor();
    fireEvent.press(screen.getByText('Últimas 24 horas'));
    expect(contador(1)).toBeTruthy();
    fireEvent.press(screen.getByText('Última semana'));
    expect(contador(3)).toBeTruthy();
    fireEvent.press(screen.getByText('Tudo'));
    expect(contador(5)).toBeTruthy();
    expect(screen.getByText('Aplicar')).toBeTruthy();
  });

  it('voltar a escolher o período em vigor dispensa a confirmação', async () => {
    await abrirMapaDeCalor();
    fireEvent.press(screen.getByText('Tudo'));
    fireEvent.press(screen.getByText('Último mês'));
    expect(screen.queryByText('Aplicar')).toBeNull();
  });

  it('combina o período com o filtro de tipo', async () => {
    await abrirMapaDeCalor();
    fireEvent.press(screen.getByText('Última semana'));
    fireEvent.press(screen.getByText('Deslizamento'));
    expect(contador(1)).toBeTruthy();
  });

  it('o voltar do Android desfaz a escolha não confirmada', async () => {
    const apertarVoltar = capturarVoltar();
    await abrirMapaDeCalor();
    fireEvent.press(screen.getByText('Últimas 24 horas'));
    let consumido;
    act(() => { consumido = apertarVoltar(); });
    expect(consumido).toBe(true);
    expect(contador(4)).toBeTruthy();
    expect(screen.queryByText('Aplicar')).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('periodoMapaCalor', expect.anything());
  });

  it('sem escolha pendente, o voltar do Android segue o comportamento normal', async () => {
    const apertarVoltar = capturarVoltar();
    await abrirMapaDeCalor();
    expect(apertarVoltar()).toBeUndefined();
  });

  it('o botão Cancelar desfaz a escolha não confirmada', async () => {
    await abrirMapaDeCalor();
    fireEvent.press(screen.getByText('Últimas 24 horas'));
    expect(contador(1)).toBeTruthy();
    fireEvent.press(screen.getByText('Cancelar'));
    expect(contador(4)).toBeTruthy();
    expect(screen.queryByText('Aplicar')).toBeNull();
    expect(screen.queryByText('Cancelar')).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('periodoMapaCalor', expect.anything());
  });

  it('desligar o mapa de calor desfaz a escolha não confirmada', async () => {
    await abrirMapaDeCalor();
    fireEvent.press(screen.getByText('Últimas 24 horas'));
    fireEvent.press(screen.getByLabelText('Mapa de calor'));
    fireEvent.press(screen.getByLabelText('Mapa de calor'));
    expect(contador(4)).toBeTruthy();
  });

  it('sair da tela sem confirmar não salva a escolha', async () => {
    const tela = await abrirMapaDeCalor();
    fireEvent.press(screen.getByText('Tudo'));
    tela.unmount();

    await abrirMapaDeCalor();
    expect(contador(4)).toBeTruthy();
  });

  it('o período confirmado é salvo e continua valendo ao reabrir', async () => {
    const tela = await abrirMapaDeCalor();
    fireEvent.press(screen.getByText('Última semana'));
    fireEvent.press(screen.getByText('Aplicar'));
    expect(contador(3)).toBeTruthy();
    expect(screen.queryByText('Aplicar')).toBeNull();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('periodoMapaCalor', 'semana');
    tela.unmount();

    await abrirMapaDeCalor();
    await waitFor(() => expect(contador(3)).toBeTruthy());
  });
});
