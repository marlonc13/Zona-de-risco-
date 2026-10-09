import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getFirestore, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'expo-router';
import app, { auth } from '../services/firebaseConfig';
import { ADMIN_PRINCIPAL, isMainAdmin, normalizarEmail } from '../services/accessControl';

const db = getFirestore(app);

export default function AdministradoresScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [administradores, setAdministradores] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [autorizada, setAutorizada] = useState(false);

  useEffect(() => {
    let pararLista = () => {};
    const pararAuth = onAuthStateChanged(auth, user => {
      pararLista();
      if (!isMainAdmin(user)) {
        setAutorizada(false);
        router.replace('/mapa');
        return;
      }
      setAutorizada(true);
      pararLista = onSnapshot(collection(db, 'administradores'), snapshot => {
        setAdministradores(snapshot.docs.map(item => ({ email: item.id, ...item.data() })).sort((a, b) => a.email.localeCompare(b.email)));
      }, erro => console.error('Erro ao listar administradores:', erro));
    });
    return () => { pararAuth(); pararLista(); };
  }, [router]);

  const cadastrar = async () => {
    const emailLimpo = normalizarEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(emailLimpo)) return Alert.alert('E-mail inválido', 'Digite um e-mail válido.');
    if (emailLimpo === ADMIN_PRINCIPAL) return Alert.alert('Já cadastrado', 'Este é o administrador principal do sistema.');
    try {
      setSalvando(true);
      await setDoc(doc(db, 'administradores', emailLimpo), {
        email: emailLimpo,
        nome: nome.trim() || 'Administrador',
        ativo: true,
        cadastradoPor: auth.currentUser?.email || ADMIN_PRINCIPAL,
        criadoEm: serverTimestamp(),
        criadoEmMillis: Date.now(),
      });
      setEmail('');
      setNome('');
      Alert.alert('Administrador cadastrado', 'A pessoa deve criar ou acessar a conta usando exatamente este e-mail.');
    } catch (erro) {
      console.error('Erro ao cadastrar administrador:', erro);
      Alert.alert('Erro', 'Não foi possível cadastrar. Confira se as regras novas do Firestore foram publicadas.');
    } finally {
      setSalvando(false);
    }
  };

  const remover = item => Alert.alert('Remover administrador', `Remover o acesso administrativo de ${item.email}?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: () => deleteDoc(doc(db, 'administradores', item.email)) },
  ]);

  if (!autorizada) return <View style={styles.loading}><Text>Verificando acesso...</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>‹</Text></TouchableOpacity>
        <View><Text style={styles.title}>Administradores</Text><Text style={styles.subtitle}>Controle de acesso ao painel</Text></View>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>Cadastrar novo administrador</Text>
        <TextInput style={styles.input} placeholder="Nome" value={nome} onChangeText={setNome} />
        <TextInput style={styles.input} placeholder="E-mail da conta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TouchableOpacity style={styles.button} onPress={cadastrar} disabled={salvando}><Text style={styles.buttonText}>{salvando ? 'Cadastrando...' : 'Adicionar administrador'}</Text></TouchableOpacity>
        <Text style={styles.note}>O administrador deverá entrar ou criar uma conta com o mesmo e-mail. Nenhuma senha é compartilhada.</Text>
      </View>

      <Text style={styles.listTitle}>Administradores autorizados</Text>
      <View style={styles.mainCard}><View><Text style={styles.adminName}>Administrador principal</Text><Text style={styles.adminEmail}>{ADMIN_PRINCIPAL}</Text></View><Text style={styles.mainBadge}>PRINCIPAL</Text></View>
      <FlatList data={administradores} keyExtractor={item => item.email} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>Nenhum outro administrador cadastrado.</Text>} renderItem={({ item }) => <View style={styles.adminCard}><View style={{ flex: 1 }}><Text style={styles.adminName}>{item.nome || 'Administrador'}</Text><Text style={styles.adminEmail}>{item.email}</Text><Text style={styles.adminMeta}>Cadastrado por {item.cadastradoPor || ADMIN_PRINCIPAL}</Text></View><TouchableOpacity style={styles.remove} onPress={() => remover(item)}><Text style={styles.removeText}>Remover</Text></TouchableOpacity></View>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fb' },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f3f4', alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, lineHeight: 32, color: '#202124' },
  title: { color: '#202124', fontSize: 22, fontWeight: '900' },
  subtitle: { color: '#5f6368', fontSize: 12 },
  form: { backgroundColor: '#fff', margin: 14, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#e1e5ea' },
  formTitle: { color: '#202124', fontSize: 16, fontWeight: '900', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#dadce0', borderRadius: 11, padding: 11, color: '#202124', marginBottom: 8 },
  button: { backgroundColor: '#1a73e8', padding: 12, borderRadius: 11, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '900' },
  note: { color: '#5f6368', fontSize: 11, lineHeight: 16, marginTop: 9 },
  listTitle: { color: '#202124', fontSize: 16, fontWeight: '900', marginHorizontal: 16, marginBottom: 7 },
  mainCard: { backgroundColor: '#e8f0fe', marginHorizontal: 14, padding: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainBadge: { color: '#1a73e8', fontSize: 10, fontWeight: '900' },
  list: { padding: 14, paddingBottom: 40, gap: 8 },
  adminCard: { backgroundColor: '#fff', padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e1e5ea' },
  adminName: { color: '#202124', fontWeight: '900' },
  adminEmail: { color: '#5f6368', fontSize: 12, marginTop: 2 },
  adminMeta: { color: '#80868b', fontSize: 10, marginTop: 4 },
  remove: { backgroundColor: '#fce8e6', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9 },
  removeText: { color: '#c5221f', fontWeight: '900', fontSize: 12 },
  empty: { color: '#80868b', textAlign: 'center', marginTop: 20 },
});
