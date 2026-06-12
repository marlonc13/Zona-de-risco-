import { Redirect } from 'expo-router';

// A tela de QR Code foi removida.
// Agora o app abre direto no mapa; login só é pedido quando a pessoa tentar criar alerta.
export default function CameraScreen() {
  return <Redirect href="/mapa" />;
}
