import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Menor lado maior aceitável para a foto. Fotos em resolução máxima (12 MP ou mais)
// passariam do limite de 300 KB de services/imageUpload.js.
const LADO_MINIMO = 1280;

// Recebe tamanhos no formato "LARGURAxALTURA" e devolve o menor cujo lado maior
// tenha pelo menos LADO_MINIMO. No iOS a lista traz presets ("Photo", "High"...),
// que são ignorados; nesse caso a câmera usa o tamanho padrão.
function escolherTamanhoFoto(tamanhos = []) {
  const validos = tamanhos
    .map(tamanho => {
      const [largura, altura] = tamanho.split('x').map(Number);
      return { tamanho, maiorLado: Math.max(largura, altura), pixels: largura * altura };
    })
    .filter(item => Number.isFinite(item.pixels) && item.pixels > 0)
    .sort((a, b) => a.pixels - b.pixels);

  if (!validos.length) return undefined;
  return (validos.find(item => item.maiorLado >= LADO_MINIMO) || validos[validos.length - 1]).tamanho;
}

/**
 * Câmera dentro do próprio app.
 *
 * Substitui ImagePicker.launchCameraAsync, que abre o app de câmera do sistema e
 * deixa o nosso app em segundo plano, onde o Android pode encerrá-lo por falta de
 * memória (o que derrubava o development build ao voltar da câmera).
 */
export default function CameraCaptura({ visivel, onFechar, onFotoTirada, cameraInicial = 'back', qualidade = 0.5 }) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [permissao, pedirPermissao] = useCameraPermissions();
  const [lado, setLado] = useState(cameraInicial);
  const [tamanhoFoto, setTamanhoFoto] = useState(undefined);
  const [cameraPronta, setCameraPronta] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [previa, setPrevia] = useState(null);
  const jaPediuPermissao = useRef(false);

  useEffect(() => {
    if (!visivel) {
      setPrevia(null);
      setCapturando(false);
      setCameraPronta(false);
      setLado(cameraInicial);
      jaPediuPermissao.current = false;
      return;
    }
    // Pede automaticamente só uma vez por abertura; se o usuário negar,
    // a tela mostra o botão para pedir de novo ou abrir as configurações.
    if (permissao && !permissao.granted && permissao.canAskAgain && !jaPediuPermissao.current) {
      jaPediuPermissao.current = true;
      pedirPermissao();
    }
  }, [visivel, permissao, pedirPermissao, cameraInicial]);

  const aoCameraPronta = async () => {
    setCameraPronta(true);
    if (tamanhoFoto) return;
    try {
      const tamanhos = await cameraRef.current?.getAvailablePictureSizesAsync();
      setTamanhoFoto(escolherTamanhoFoto(tamanhos));
    } catch (error) {
      console.warn('Não foi possível listar os tamanhos de foto:', error);
    }
  };

  const capturar = async () => {
    if (!cameraRef.current || !cameraPronta || capturando) return;
    try {
      setCapturando(true);
      const foto = await cameraRef.current.takePictureAsync({ quality: qualidade });
      if (foto?.uri) setPrevia(foto.uri);
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto. Tente novamente.');
    } finally {
      setCapturando(false);
    }
  };

  const usarFoto = () => {
    const uri = previa;
    setPrevia(null);
    onFotoTirada?.(uri);
    onFechar?.();
  };

  const voltar = () => {
    if (previa) {
      setPrevia(null);
      return;
    }
    onFechar?.();
  };

  const trocarLado = () => {
    setCameraPronta(false);
    setTamanhoFoto(undefined);
    setLado(atual => (atual === 'back' ? 'front' : 'back'));
  };

  const renderizarConteudo = () => {
    if (!permissao) {
      return <ActivityIndicator style={styles.centro} color="#fff" size="large" />;
    }

    if (!permissao.granted) {
      return (
        <View style={[styles.centro, styles.permissaoBox]}>
          <Ionicons name="camera-outline" size={48} color="#fff" />
          <Text style={styles.permissaoTexto}>Permita o acesso à câmera para tirar a foto.</Text>
          <TouchableOpacity
            style={styles.botaoPrimario}
            onPress={() => (permissao.canAskAgain ? pedirPermissao() : Linking.openSettings())}
          >
            <Text style={styles.botaoPrimarioTexto}>
              {permissao.canAskAgain ? 'Permitir câmera' : 'Abrir configurações'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoSecundario} onPress={onFechar}>
            <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (previa) {
      return (
        <>
          <Image source={{ uri: previa }} style={styles.previa} resizeMode="contain" />
          <View style={[styles.barraInferior, { paddingBottom: insets.bottom + 24 }]}>
            <TouchableOpacity style={styles.botaoSecundario} onPress={() => setPrevia(null)}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.botaoSecundarioTexto}>Tirar outra</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.botaoPrimario} onPress={usarFoto}>
              <Ionicons name="checkmark" size={20} color="#1a73e8" />
              <Text style={styles.botaoPrimarioTexto}>Usar foto</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return (
      <>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={lado}
          pictureSize={tamanhoFoto}
          onCameraReady={aoCameraPronta}
          onMountError={({ message }) => {
            console.error('Erro ao abrir a câmera:', message);
            Alert.alert('Erro', 'Não foi possível abrir a câmera.');
            onFechar?.();
          }}
        />
        <View style={[styles.barraInferior, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.espacoLateral} />
          <TouchableOpacity
            style={[styles.disparador, (!cameraPronta || capturando) && styles.desabilitado]}
            onPress={capturar}
            disabled={!cameraPronta || capturando}
            accessibilityLabel="Tirar foto"
          >
            {capturando ? <ActivityIndicator color="#1a73e8" /> : <View style={styles.disparadorInterno} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.espacoLateral} onPress={trocarLado} accessibilityLabel="Trocar câmera">
            <Ionicons name="camera-reverse-outline" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={voltar} statusBarTranslucent>
      <View style={styles.container}>
        {renderizarConteudo()}
        <TouchableOpacity
          style={[styles.botaoFechar, { top: insets.top + 12 }]}
          onPress={voltar}
          accessibilityLabel={previa ? 'Descartar foto' : 'Fechar câmera'}
        >
          <Ionicons name={previa ? 'arrow-back' : 'close'} size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permissaoBox: { paddingHorizontal: 32, gap: 16 },
  permissaoTexto: { color: '#fff', fontSize: 16, textAlign: 'center' },
  previa: { flex: 1, width: '100%' },
  barraInferior: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  espacoLateral: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  disparador: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disparadorInterno: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  desabilitado: { opacity: 0.5 },
  botaoFechar: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  botaoPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  botaoPrimarioTexto: { color: '#1a73e8', fontWeight: '700', fontSize: 16 },
  botaoSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#fff',
  },
  botaoSecundarioTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
