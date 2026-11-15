import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

const chaveBiometria = uid => `biometriaAtiva:${uid}`;

// true = protegida, false = recusou, null = ainda não decidiu
export async function preferenciaBiometria(uid) {
  const valor = await AsyncStorage.getItem(chaveBiometria(uid));
  if (valor === null) return null;
  return valor === 'true';
}

export async function definirBiometria(uid, ativa) {
  await AsyncStorage.setItem(chaveBiometria(uid), String(ativa));
}

export async function removerPreferenciaBiometria(uid) {
  await AsyncStorage.removeItem(chaveBiometria(uid));
}

// `indisponivel` indica que o aparelho não tem biometria ou não há nenhuma cadastrada
export async function authenticateWithBiometrics() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { success: false, indisponivel: true, message: 'Sem suporte a biometria' };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return { success: false, indisponivel: true, message: 'Cadastre biometria no celular' };
    }

    return await LocalAuthentication.authenticateAsync({
      promptMessage: 'Entrar com biometria',
      fallbackLabel: 'Usar senha',
    });
  } catch {
    return { success: false, message: 'Erro na biometria' };
  }
}
