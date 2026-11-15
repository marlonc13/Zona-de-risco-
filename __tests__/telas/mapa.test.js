import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { addDoc } from 'firebase/firestore';
import MapScreen from '../../app/(tabs)/mapa';

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockUsuario = { uid: 'uid-admin', email: 'admin@exemplo.com', displayName: 'Admin' };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({}) }));
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
