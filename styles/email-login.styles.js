import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.84)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  logo: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 8, overflow: 'hidden' },
  // Novo estilo para controlar as dimensões da imagem dentro do círculo
  logoImagem: { width: '70%', height: '70%' },
  title: { fontSize: 28, fontWeight: '900', color: '#202124' },
  subtitle: { fontSize: 15, color: '#444', textAlign: 'center', marginTop: 8, marginBottom: 22, lineHeight: 21 },
  input: { width: '100%', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#dadce0', color: '#202124' },
  button: { width: '100%', backgroundColor: '#1a73e8', paddingVertical: 15, borderRadius: 15, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  linkButton: { marginTop: 15, padding: 8 },
  linkText: { color: '#1a73e8', fontWeight: '800' },
  visitanteButton: { width: '100%', backgroundColor: '#fff', paddingVertical: 14, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#dadce0', marginTop: 8 },
  visitanteText: { color: '#1a73e8', fontWeight: '800', fontSize: 15 },
  voltarButton: { marginTop: 10, padding: 8 },
  voltarText: { color: '#5f6368', fontWeight: '700' },
});

export default styles;
