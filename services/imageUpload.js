import * as FileSystem from 'expo-file-system/legacy';
import { auth } from './firebaseConfig';

const STORAGE_BUCKET = 'zona-de-risco.firebasestorage.app';

function descobrirContentType(uri) {
  const caminhoSemQuery = uri.split('?')[0].toLowerCase();
  if (caminhoSemQuery.endsWith('.png')) return 'image/png';
  if (caminhoSemQuery.endsWith('.webp')) return 'image/webp';
  if (caminhoSemQuery.endsWith('.heic') || caminhoSemQuery.endsWith('.heif')) {
    return 'image/heic';
  }
  return 'image/jpeg';
}

function criarErroStorage(etapa, status, resposta) {
  let detalhe = '';
  try {
    const dados = JSON.parse(resposta || '{}');
    detalhe = dados?.error?.message || dados?.error?.status || '';
  } catch {
    detalhe = resposta || '';
  }

  const sufixo = detalhe ? `: ${detalhe}` : '.';
  const erro = new Error(`O Storage recusou a imagem ao ${etapa} (HTTP ${status})${sufixo}`);
  erro.code = `storage/http-${status}`;
  return erro;
}

export async function uploadImage(uri, caminho) {
  if (!uri || uri.startsWith('http')) return uri || null;
  const usuario = auth.currentUser;
  if (!usuario) throw new Error('Entre na sua conta antes de enviar uma imagem.');

  let arquivoUri = uri;
  if (uri.startsWith('data:')) {
    arquivoUri = `${FileSystem.cacheDirectory}zona-risco-${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(arquivoUri, uri.substring(uri.indexOf(',') + 1), {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  const token = await usuario.getIdToken();
  const infoArquivo = await FileSystem.getInfoAsync(arquivoUri);
  if (!infoArquivo.exists || infoArquivo.isDirectory) {
    throw new Error('A imagem escolhida não está mais disponível no aparelho.');
  }

  const contentType = descobrirContentType(arquivoUri);
  const nomeCodificado = encodeURIComponent(caminho);
  const urlInicial = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?name=${nomeCodificado}`;
  const inicio = await fetch(urlInicial, {
    method: 'POST',
    headers: {
      Authorization: `Firebase ${token}`,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(infoArquivo.size),
      'X-Goog-Upload-Header-Content-Type': contentType,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      name: caminho,
      size: infoArquivo.size,
      contentType,
    }),
  });

  if (!inicio.ok) {
    throw criarErroStorage('iniciar o envio', inicio.status, await inicio.text());
  }

  const urlUpload = inicio.headers.get('x-goog-upload-url');
  if (!urlUpload) {
    throw new Error('O Storage não forneceu o endereço para concluir o envio.');
  }

  const resultado = await FileSystem.uploadAsync(urlUpload, arquivoUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': contentType,
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
    },
  });

  if (resultado.status < 200 || resultado.status >= 300) {
    throw criarErroStorage('concluir o envio', resultado.status, resultado.body);
  }

  let tokenDownload = null;
  try {
    tokenDownload = JSON.parse(resultado.body || '{}').downloadTokens?.split(',')?.[0] || null;
  } catch {
    // Se não vier token, a URL ainda funciona quando a leitura é permitida pelas regras.
  }

  const tokenQuery = tokenDownload ? `&token=${encodeURIComponent(tokenDownload)}` : '';
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${nomeCodificado}?alt=media${tokenQuery}`;
}
