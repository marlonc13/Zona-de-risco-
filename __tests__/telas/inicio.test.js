import { Alert } from 'react-native';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { verificarAdministrador } from '../../services/accessControl';
import { authenticateWithBiometrics, preferenciaBiometria } from '../../services/biometricAuth';
import Inicio from '../../app/inicio';

const mockReplace = jest.fn();
// como no expo-router, useRouter devolve sempre o mesmo objeto
const mockRouter = { replace: mockReplace, push: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(), signOut: jest.fn(() => Promise.resolve()) }));
jest.mock('../../services/firebaseConfig', () => ({ auth: {} }));
jest.mock('../../services/accessControl', () => ({ verificarAdministrador: jest.fn() }));
jest.mock('../../services/biometricAuth', () => ({
  preferenciaBiometria: jest.fn(),
  authenticateWithBiometrics: jest.fn(),
}));

const USUARIO = { uid: 'uid-1', email: 'usuario@exemplo.com' };

// Guarda o callback do Firebase para o teste decidir quando e com quem a sessão "chega"
let avisarSessao;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  onAuthStateChanged.mockImplementation((_auth, callback) => {
    avisarSessao = callback;
    return jest.fn();
  });
  verificarAdministrador.mockResolvedValue(false);
  preferenciaBiometria.mockResolvedValue(false);
});

async function abrirComSessao(usuario) {
  render(<Inicio />);
  await act(async () => { await avisarSessao(usuario); });
}

it('sem sessão, mostra as opções de entrar como visitante ou fazer login', async () => {
  await abrirComSessao(null);
  expect(screen.getByText('Entrar como visitante')).toBeTruthy();
  expect(screen.getByText('Fazer login / criar conta')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('com sessão e sem biometria, entra direto no mapa', async () => {
  await abrirComSessao(USUARIO);
  expect(authenticateWithBiometrics).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith('/mapa');
});

it('leva o administrador para o painel', async () => {
  verificarAdministrador.mockResolvedValue(true);
  await abrirComSessao(USUARIO);
  expect(mockReplace).toHaveBeenCalledWith('/admin');
});

it('com biometria ativa, entra depois de confirmar a digital', async () => {
  preferenciaBiometria.mockResolvedValue(true);
  authenticateWithBiometrics.mockResolvedValue({ success: true });
  await abrirComSessao(USUARIO);
  expect(authenticateWithBiometrics).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith('/mapa');
});

it('com biometria ativa e não confirmada, sai da conta e não entra', async () => {
  preferenciaBiometria.mockResolvedValue(true);
  authenticateWithBiometrics.mockResolvedValue({ success: false, error: 'user_cancel' });
  await abrirComSessao(USUARIO);

  expect(signOut).toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Biometria não confirmada', expect.any(String));
  await waitFor(() => expect(screen.getByText('Fazer login / criar conta')).toBeTruthy());
});

it('se o aparelho não tiver mais biometria, a entrada segue normalmente', async () => {
  preferenciaBiometria.mockResolvedValue(true);
  authenticateWithBiometrics.mockResolvedValue({ success: false, indisponivel: true });
  await abrirComSessao(USUARIO);
  expect(signOut).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith('/mapa');
});

it('ignora o login feito depois na tela de e-mail (ela cuida da própria navegação)', async () => {
  await abrirComSessao(null);
  await act(async () => { await avisarSessao(USUARIO); });
  expect(mockReplace).not.toHaveBeenCalled();
});
