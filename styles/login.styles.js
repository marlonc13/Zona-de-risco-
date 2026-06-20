import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.78)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  avatar: { width: 95, height: 95, borderRadius: 48, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 10, overflow: 'hidden' },
  // Estilo novo para controlar o tamanho da logo dentro do círculo
  logoImagem: { width: '70%', height: '70%' }, 
  nome: { fontSize: 26, fontWeight: 'bold', color: '#202124' },
  subtitulo: { fontSize: 15, color: '#444', marginTop: 8, marginBottom: 28, textAlign: 'center', lineHeight: 21 },
  emailBotao: { marginTop: 14, backgroundColor: '#fff', width: '100%', paddingVertical: 14, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#dadce0' },
  emailTexto: { color: '#1a73e8', fontWeight: '800', fontSize: 15 },
  visitanteBotao: { marginTop: 14, backgroundColor: '#1a73e8', width: '100%', paddingVertical: 14, borderRadius: 15, alignItems: 'center' },
  visitanteTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
  voltarBotao: { marginTop: 12, padding: 10 },
  voltarTexto: { color: '#1a73e8', fontWeight: '700' },
});

export default styles;
