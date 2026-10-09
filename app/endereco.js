import { Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import app, { auth } from '../services/firebaseConfig';

const db = getFirestore(app);

export default function Endereco() {
  const router = useRouter();
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Minha residência</Text>
      <Text style={styles.subtitle}>Cadastre ou altere o endereço da sua casa.</Text>
      <TouchableOpacity style={styles.locationButton} onPress={usarLocalizacao}><Text style={styles.locationText}>📍 Usar minha localização atual</Text></TouchableOpacity>
      <TextInput style={styles.input} placeholder="Rua / Avenida" value={endereco} onChangeText={setEndereco} />
      <TextInput style={styles.input} placeholder="Número" value={numero} onChangeText={setNumero} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Bairro" value={bairro} onChangeText={setBairro} />
      <TextInput style={styles.input} placeholder="Cidade" value={cidade} onChangeText={setCidade} />
      <TextInput style={styles.input} placeholder="Estado" value={estado} onChangeText={setEstado} />
      <TouchableOpacity style={styles.save} onPress={salvar} disabled={salvando}><Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Salvar endereço'}</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5f7fb', padding: 26, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#202124' },
  subtitle: { color: '#5f6368', marginTop: 6, marginBottom: 20 },
  locationButton: { backgroundColor: '#e8f0fe', padding: 15, borderRadius: 14, marginBottom: 16 },
  locationText: { color: '#1a73e8', fontWeight: '800', textAlign: 'center' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dadce0', borderRadius: 13, padding: 14, marginBottom: 12 },
  save: { backgroundColor: '#1a73e8', borderRadius: 14, padding: 16, marginTop: 6 },
  saveText: { color: '#fff', textAlign: 'center', fontWeight: '900', fontSize: 16 },
});
