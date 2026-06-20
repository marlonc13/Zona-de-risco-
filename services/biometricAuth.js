import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateWithBiometrics() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { success: false, message: 'Sem suporte a biometria' };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return { success: false, message: 'Cadastre biometria no celular' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Entrar com biometria',
      fallbackLabel: 'Usar senha',
    });

    return result;

  } catch (error) {
    return { success: false, message: 'Erro na biometria' };
  }
}