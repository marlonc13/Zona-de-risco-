import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(255,255,255,0.82)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  logo: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 10, marginBottom: 18, overflow: 'hidden' },
  logoImagem: { width: '70%', height: '70%' },
  title: { fontSize: 30, fontWeight: '900', color: '#202124' },
  subtitle: { fontSize: 16, color: '#444', textAlign: 'center', marginTop: 10, marginBottom: 28, lineHeight: 22 },
  primaryButton: { width: '100%', backgroundColor: '#1a73e8', paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryButton: { width: '100%', backgroundColor: '#fff', paddingVertical: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#dadce0' },
  secondaryText: { color: '#1a73e8', fontSize: 16, fontWeight: '800' },
  note: { marginTop: 18, color: '#5f6368', textAlign: 'center', fontSize: 13, lineHeight: 18 },
});

export default styles;
