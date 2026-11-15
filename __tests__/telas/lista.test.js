import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { observarStatusAdministrador } from '../../services/accessControl';
import ListaAlertasScreen from '../../app/(tabs)/lista';

const mockRouter = { push: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../services/firebaseConfig', () => ({ __esModule: true, default: {}, auth: { currentUser: { email: 'admin@exemplo.com' } } }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn((_auth, callback) => { callback({ email: 'admin@exemplo.com' }); return jest.fn(); }) }));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn((_db, colecao, id) => `${colecao}/${id}`),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 'agora'),
  arrayUnion: jest.fn(valor => valor),
}));
jest.mock('../../services/accessControl', () => ({ observarStatusAdministrador: jest.fn() }));

const UMA_HORA = 60 * 60 * 1000;
const alerta = (id, extra) => ({
  id,
  data: () => ({
    tipo: 'Alagamento',
    gravidade: 'Alerta',
    comentario: `Ocorrência ${id}`,
    bairro: 'Centro',
    status: 'ativo',
    oficial: true,
    createdAtMillis: Date.now() - UMA_HORA,
    ...extra,
  }),
});

function abrirComAlertas(alertas, { administrador = true } = {}) {
  observarStatusAdministrador.mockImplementation((_user, callback) => { callback(administrador); return jest.fn(); });
  onSnapshot.mockImplementation((_ref, callback) => { callback({ docs: alertas }); return jest.fn(); });
  render(<ListaAlertasScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('modal "Alterar situação"', () => {
  beforeEach(() => {
    abrirComAlertas([alerta('a1', { expiresAt: Date.now() + UMA_HORA })]);
    fireEvent.press(screen.getByText('Alterar situação'));
  });

  it('lista cada situação uma única vez', () => {
    for (const situacao of ['Rascunho', 'Em monitoramento', 'Controlada', 'Encerrada']) {
      expect(screen.getAllByText(situacao)).toHaveLength(1);
    }
    expect(screen.getByText('Alagamento · situação atual: Ativa')).toBeTruthy();
  });

  it('marca a situação atual', () => {
    expect(screen.getAllByText('ATUAL')).toHaveLength(1);
  });

  it('pede confirmação e grava a nova situação no histórico', async () => {
    fireEvent.press(screen.getByText('Controlada'));

    const [titulo, , botoes] = Alert.alert.mock.calls[0];
    expect(titulo).toBe('Alterar para “Controlada”');
    await act(async () => { await botoes.find(b => b.text === 'Confirmar').onPress(); });

    expect(updateDoc).toHaveBeenCalledWith('marcacoes/a1', expect.objectContaining({
      status: 'controlado',
      historicoAdministrativo: expect.objectContaining({ statusAnterior: 'ativo', statusNovo: 'controlado' }),
    }));
  });
});

describe('selo de validade do card', () => {
  it('mostra só a hora quando expira hoje', () => {
    const daquiAPouco = new Date();
    daquiAPouco.setMinutes(daquiAPouco.getMinutes() + 5);
    // perto da meia-noite o alerta "de hoje" já seria de amanhã; nesse caso pula a checagem
    if (daquiAPouco.getDate() !== new Date().getDate()) return;
    abrirComAlertas([alerta('a1', { expiresAt: daquiAPouco.getTime() })]);
    expect(screen.getByText(/^Expira às \d{2}:\d{2}$/)).toBeTruthy();
  });

  it('mostra a data quando expira em outro dia', () => {
    abrirComAlertas([alerta('a1', { expiresAt: Date.now() + 3 * 24 * UMA_HORA })]);
    expect(screen.getByText(/^Expira em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/)).toBeTruthy();
  });

  it('não fala em "expira" para alerta que já saiu do mapa', () => {
    abrirComAlertas([alerta('a1', { expiresAt: Date.now() - UMA_HORA })]);
    expect(screen.getByText('Fora do mapa')).toBeTruthy();
    expect(screen.queryByText(/Expira/)).toBeNull();
  });
});

describe('visitantes e usuários comuns', () => {
  it('não veem rascunhos nem os botões de administrador', async () => {
    abrirComAlertas([
      alerta('publicado', { expiresAt: Date.now() + UMA_HORA }),
      alerta('rascunho', { status: 'rascunho', oficial: false, expiresAt: null }),
    ], { administrador: false });

    await waitFor(() => expect(screen.getByText('Ocorrência publicado')).toBeTruthy());
    expect(screen.queryByText('Ocorrência rascunho')).toBeNull();
    expect(screen.queryByText('Alterar situação')).toBeNull();
    expect(screen.queryByText('Excluir')).toBeNull();
  });
});
