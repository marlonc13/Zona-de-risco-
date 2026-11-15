import { TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/texto';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import app, { auth } from '../services/firebaseConfig';
import { criarEstilos, useEstilos, useTema } from '../hooks/use-tema';

const db = getFirestore(app);

export default function Endereco() {
  const router = useRouter();
  const styles = useEstilos(estilos);
  const insets = useSafeAreaInsets();
  const { cores } = useTema();
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      const user = auth.currentUser;
      if (!user) return router.replace('/email-login');
      const snapshot = await getDoc(doc(db, 'usuarios', user.uid));
      const dados = snapshot.data()?.endereco;
      if (dados) {
        setEndereco(dados.logradouro || ''); setNumero(dados.numero || '');
        setBairro(dados.bairro || ''); setCidade(dados.cidade || ''); setEstado(dados.estado || '');
      }
    };
    carregar();
  }, [router]);

  const usarLocalizacao = async () => {
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (!permissao.granted) return Alert.alert('Permissão necessária', 'Autorize a localização do celular.');
    const posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const [resultado] = await Location.reverseGeocodeAsync(posicao.coords);
    if (resultado) {
      setEndereco(resultado.street || resultado.name || ''); setNumero(resultado.streetNumber || '');
      setBairro(resultado.district || resultado.subregion || ''); setCidade(resultado.city || resultado.region || '');
      setEstado(resultado.region || '');
    }
  };

  const salvar = async () => {
    const user = auth.currentUser;
    if (!user || !endereco.trim() || !cidade.trim()) return Alert.alert('Campos obrigatórios', 'Informe pelo menos endereço e cidade.');
    try {
      setSalvando(true);
      const textoCompleto = `${endereco}, ${numero}, ${bairro}, ${cidade} - ${estado}`;
      const [coordenadas] = await Location.geocodeAsync(textoCompleto);
      await setDoc(doc(db, 'usuarios', user.uid), {
        nome: user.displayName || 'Usuário', email: user.email,
        endereco: { logradouro: endereco.trim(), numero: numero.trim(), bairro: bairro.trim(), cidade: cidade.trim(), estado: estado.trim(), latitude: coordenadas?.latitude || null, longitude: coordenadas?.longitude || null },
      }, { merge: true });
      Alert.alert('Endereço salvo', 'Sua residência foi cadastrada com sucesso.');
      router.back();
    } catch (erro) {
      console.error(erro); Alert.alert('Erro', 'Não foi possível salvar o endereço. Verifique as permissões do Firebase.');
    } finally { setSalvando(false); }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 26 + insets.bottom }]}>
      <Text style={styles.title}>Minha residência</Text>
      <Text style={styles.subtitle}>Cadastre ou altere o endereço da sua casa.</Text>
      <TouchableOpacity style={styles.locationButton} onPress={usarLocalizacao}><Text style={styles.locationText}>📍 Usar minha localização atual</Text></TouchableOpacity>
      <TextInput style={styles.input} placeholder="Rua / Avenida" placeholderTextColor={cores.placeholder} value={endereco} onChangeText={setEndereco} />
      <TextInput style={styles.input} placeholder="Número" placeholderTextColor={cores.placeholder} value={numero} onChangeText={setNumero} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Bairro" placeholderTextColor={cores.placeholder} value={bairro} onChangeText={setBairro} />
      <TextInput style={styles.input} placeholder="Cidade" placeholderTextColor={cores.placeholder} value={cidade} onChangeText={setCidade} />
      <TextInput style={styles.input} placeholder="Estado" placeholderTextColor={cores.placeholder} value={estado} onChangeText={setEstado} />
      <TouchableOpacity style={styles.save} onPress={salvar} disabled={salvando}><Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Salvar endereço'}</Text></TouchableOpacity>
    </ScrollView>
  );
}

const estilos = criarEstilos((c, tema) => ({
  container: { flexGrow: 1, backgroundColor: c.screen, padding: 26, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: c.textStrong },
  subtitle: { color: c.textMuted, marginTop: 6, marginBottom: 20 },
  locationButton: { backgroundColor: c.tintBackground, padding: 15, borderRadius: 14, marginBottom: 16 },
  locationText: { color: c.tint, fontWeight: '800', textAlign: 'center' },
  // no claro mantém a cor de texto padrão do sistema
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 13, padding: 14, marginBottom: 12, ...(tema === 'dark' ? { color: c.textStrong } : {}) },
  save: { backgroundColor: c.button, borderRadius: 14, padding: 16, marginTop: 6 },
  saveText: { color: c.onButton, textAlign: 'center', fontWeight: '900', fontSize: 16 },
}));
