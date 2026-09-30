import * as FileSystem from 'expo-file-system/legacy';
import { auth } from './firebaseConfig';

// O projeto não possui um bucket do Firebase Storage. Para manter o app no
// plano gratuito, a foto comprimida é guardada como data URI no Firestore.
const TAMANHO_MAXIMO_BYTES = 600 * 1024;

function descobrirContentType(uri) {
  const caminhoSemQuery = uri.split('?')[0].toLowerCase();
  if (caminhoSemQuery.endsWith('.png')) return 'image/png';
  if (caminhoSemQuery.endsWith('.webp')) return 'image/webp';
  if (caminhoSemQuery.endsWith('.heic') || caminhoSemQuery.endsWith('.heif')) {
    return 'image/heic';
  }
  return 'image/jpeg';
}

export async function uploadImage(uri) {
  if (!uri || uri.startsWith('http') || uri.startsWith('data:')) return uri || null;
  if (!auth.currentUser) throw new Error('Entre na sua conta antes de enviar uma imagem.');

  const infoArquivo = await FileSystem.getInfoAsync(uri);
  if (!infoArquivo.exists || infoArquivo.isDirectory) {
    throw new Error('A imagem escolhida não está mais disponível no aparelho.');
  }
  if (infoArquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error('A foto ficou muito grande. Escolha outra imagem ou recorte uma área menor.');
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:${descobrirContentType(uri)};base64,${base64}`;
}
