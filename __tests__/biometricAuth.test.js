import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  authenticateWithBiometrics,
  definirBiometria,
  preferenciaBiometria,
  removerPreferenciaBiometria,
} from '../services/biometricAuth';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('preferência de biometria por conta', () => {
  it('começa sem decisão (null), para o app perguntar uma vez', async () => {
    await expect(preferenciaBiometria('uid-1')).resolves.toBeNull();
  });

  it('guarda ativada e recusada separadamente para cada conta', async () => {
    await definirBiometria('uid-1', true);
    await definirBiometria('uid-2', false);
    await expect(preferenciaBiometria('uid-1')).resolves.toBe(true);
    await expect(preferenciaBiometria('uid-2')).resolves.toBe(false);
  });

  it('volta a "sem decisão" ao remover (ex.: conta excluída)', async () => {
    await definirBiometria('uid-1', true);
    await removerPreferenciaBiometria('uid-1');
    await expect(preferenciaBiometria('uid-1')).resolves.toBeNull();
  });
});

describe('authenticateWithBiometrics', () => {
  it('marca como indisponível quando o aparelho não tem biometria', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);
    await expect(authenticateWithBiometrics()).resolves.toMatchObject({ success: false, indisponivel: true });
    expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
  });

  it('marca como indisponível quando não há biometria cadastrada', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);
    await expect(authenticateWithBiometrics()).resolves.toMatchObject({ success: false, indisponivel: true });
  });

  it('devolve o resultado da leitura quando a biometria está disponível', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });
    const resultado = await authenticateWithBiometrics();
    expect(resultado.success).toBe(false);
    // cancelar não é "indisponível": quem tem biometria ativa precisa entrar com a senha
    expect(resultado.indisponivel).toBeUndefined();
  });

  it('não deixa erro do sensor quebrar o app', async () => {
    LocalAuthentication.hasHardwareAsync.mockRejectedValue(new Error('falha'));
    await expect(authenticateWithBiometrics()).resolves.toMatchObject({ success: false });
  });
});
