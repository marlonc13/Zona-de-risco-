import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { isAdminUser } from '../services/accessControl';

export default function Admin() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);

  useEffect(() => onAuthStateChanged(auth, user => {
    if (!isAdminUser(user)) {
      router.replace('/mapa');
      return;
    }
    setCarregando(false);
  }), [router]);

  if (carregando) return <View style={styles.center}><Text>Verificando administrador...</Text></View>;

  const sair = async () => {
    await signOut(auth);
    router.replace('/inicio');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>ADMINISTRADOR</Text>
      <Text style={styles.title}>Painel de ocorrências</Text>
      <Text style={styles.subtitle}>Cadastre e acompanhe somente riscos naturais.</Text>

      <TouchableOpacity style={styles.primary} onPress={() => router.replace('/mapa')}>
        <Text style={styles.primaryText}>🗺️ Abrir mapa e publicar alerta</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card} onPress={() => router.push('/lista')}>
        <Text style={styles.cardText}>📋 Ver todas as ocorrências</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card} onPress={() => router.push('/perfil')}>
        <Text style={styles.cardText}>👤 Meu perfil</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logout} onPress={sair}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb', padding: 28, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', backgroundColor: '#d93025', color: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontWeight: '900' },
  title: { fontSize: 30, fontWeight: '900', color: '#202124', marginTop: 18 },
  subtitle: { fontSize: 16, color: '#5f6368', marginTop: 8, marginBottom: 28 },
  primary: { backgroundColor: '#1a73e8', padding: 18, borderRadius: 16, marginBottom: 12 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e1e5ea' },
  cardText: { color: '#202124', fontSize: 16, fontWeight: '700' },
  logout: { padding: 16, alignItems: 'center', marginTop: 10 },
  logoutText: { color: '#d93025', fontWeight: '800' },
});
