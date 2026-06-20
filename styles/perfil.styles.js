import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 22, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#202124' },
  avatar: { width: 132, height: 132, borderRadius: 66, backgroundColor: '#e8f0fe', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  plus: { fontSize: 34, color: '#1a73e8' },
  photoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  secondaryButton: { backgroundColor: '#e8f0fe', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  secondaryText: { color: '#1a73e8', fontWeight: '700' },
  input: { width: '100%', backgroundColor: '#f8fafd', padding: 14, borderRadius: 14, marginBottom: 12, color: '#202124', borderWidth: 1, borderColor: '#e0e0e0' },
  disabled: { color: '#777', backgroundColor: '#f1f3f4' },
  button: { backgroundColor: '#1a73e8', padding: 14, borderRadius: 14, marginTop: 8, width: '100%', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoutButton: { padding: 14, borderRadius: 14, marginTop: 12, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#d93025' },
  logoutText: { color: '#d93025', fontWeight: 'bold' },
});

export default styles;
