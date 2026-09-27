import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import app, { auth } from '../services/firebaseConfig';
import { isMainAdmin, observarStatusAdministrador } from '../services/accessControl';
import { collection, getFirestore, onSnapshot } from 'firebase/firestore';

const db = getFirestore(app);

export default function Admin() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [estatisticas, setEstatisticas] = useState({ ativos: 0, encerrados: 0, principal: 'Nenhum' });
  const [principal, setPrincipal] = useState(false);

  useEffect(() => {
    let pararAdmin = () => {};
    const pararAuth = onAuthStateChanged(auth, user => {
      setPrincipal(isMainAdmin(user));
      pararAdmin();
      pararAdmin = observarStatusAdministrador(user, autorizado => {
        if (!autorizado) router.replace('/mapa');
        else setCarregando(false);
      });
    });
    return () => { pararAuth(); pararAdmin(); };
  }, [router]);

  useEffect(() => onSnapshot(collection(db, 'marcacoes'), snapshot => {
    const agora = Date.now();
    const alertas = snapshot.docs.map(documento => documento.data());
    const ativos = alertas.filter(item => item.status !== 'encerrado' && item.expiresAt > agora);
    const encerrados = alertas.length - ativos.length;
    const contagem = ativos.reduce((total, item) => ({ ...total, [item.tipo]: (total[item.tipo] || 0) + 1 }), {});
    const principal = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nenhum';
    setEstatisticas({ ativos: ativos.length, encerrados, principal });
  }, erro => console.error('Erro nas estatísticas:', erro)), []);

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

      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statNumber}>{estatisticas.ativos}</Text><Text style={styles.statLabel}>Ativos</Text></View>
        <View style={styles.statCard}><Text style={styles.statNumber}>{estatisticas.encerrados}</Text><Text style={styles.statLabel}>Encerrados</Text></View>
      </View>
      <View style={styles.mainRisk}><Text style={styles.mainRiskLabel}>Risco ativo mais frequente</Text><Text style={styles.mainRiskValue}>{estatisticas.principal}</Text></View>

      <TouchableOpacity style={styles.primary} onPress={() => router.replace('/mapa')}>
        <Text style={styles.primaryText}>🗺️ Abrir mapa e publicar alerta</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card} onPress={() => router.push('/lista')}>
        <Text style={styles.cardText}>📋 Ver todas as ocorrências</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card} onPress={() => router.push('/relatorio')}>
        <Text style={styles.cardText}>📊 Relatórios e exportação em PDF</Text>
      </TouchableOpacity>
      {principal && <TouchableOpacity style={styles.card} onPress={() => router.push('/administradores')}>
        <Text style={styles.cardText}>👥 Cadastrar administradores</Text>
      </TouchableOpacity>}
      <TouchableOpacity style={styles.card} onPress={() => router.push('/abrigos')}>
        <Text style={styles.cardText}>🏠 Gerenciar abrigos e pontos seguros</Text>
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e1e5ea' },
  statNumber: { fontSize: 28, fontWeight: '900', color: '#1a73e8' },
  statLabel: { color: '#5f6368', fontWeight: '700' },
  mainRisk: { backgroundColor: '#fff4e5', borderRadius: 16, padding: 14, marginBottom: 18 },
  mainRiskLabel: { color: '#8a3b00', fontSize: 12, fontWeight: '700' },
  mainRiskValue: { color: '#8a3b00', fontSize: 17, fontWeight: '900', marginTop: 2 },
  primary: { backgroundColor: '#1a73e8', padding: 18, borderRadius: 16, marginBottom: 12 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e1e5ea' },
  cardText: { color: '#202124', fontSize: 16, fontWeight: '700' },
  logout: { padding: 16, alignItems: 'center', marginTop: 10 },
  logoutText: { color: '#d93025', fontWeight: '800' },
});
