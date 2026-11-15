import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/texto';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { collection, doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';
import app, { auth } from '../services/firebaseConfig';
import { pesquisarEnderecos } from '../services/addressSearch';
import { distanciaKm } from '../services/proximityNotifications';
import { apareceNoMapa } from '../services/alertLifecycle';
import { criarEstilos, useEstilos, useTema } from '../hooks/use-tema';

const db = getFirestore(app);
const CORES_MARCADOR = ['#7b1fa2', '#d93025', '#1a73e8', '#137333', '#f9ab00'];

export default function Familiares() {
  const router = useRouter();
  const styles = useEstilos(estilos);
  const insets = useSafeAreaInsets();
  const { cores } = useTema();
  const [nome, setNome] = useState('');
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [enderecos, setEnderecos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [pesquisando, setPesquisando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [cor, setCor] = useState(CORES_MARCADOR[0]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/email-login');
      return undefined;
    }
    return onSnapshot(doc(db, 'usuarios', user.uid), snapshot => {
      setEnderecos((snapshot.data()?.enderecosFamiliares || []).slice(0, 5));
    }, erro => console.error('Erro ao carregar pessoas:', erro));
  }, [router]);

  useEffect(() => onSnapshot(collection(db, 'marcacoes'), snapshot => {
    setAlertas(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(apareceNoMapa));
  }, erro => console.error('Erro ao carregar riscos:', erro)), []);

  const pesquisar = async () => {
    if (busca.trim().length < 3) return Alert.alert('Digite um endereço', 'Informe pelo menos três letras para pesquisar.');
    try {
      setPesquisando(true);
      setSelecionado(null);
      setResultados(await pesquisarEnderecos(busca));
    } catch (erro) {
      console.error(erro);
      Alert.alert('Pesquisa indisponível', 'Não foi possível buscar o endereço agora.');
    } finally { setPesquisando(false); }
  };

  const salvarLista = async lista => {
    const user = auth.currentUser;
    if (!user) return;
    await setDoc(doc(db, 'usuarios', user.uid), { enderecosFamiliares: lista }, { merge: true });
  };

  const adicionar = async () => {
    if (!nome.trim()) return Alert.alert('Nome obrigatório', 'Informe quem mora nesse endereço.');
    if (!selecionado) return Alert.alert('Selecione o endereço', 'Pesquise e toque em um dos resultados antes de salvar.');
    if (enderecos.length >= 5) return Alert.alert('Limite atingido', 'É possível acompanhar até 5 pessoas.');
    try {
      setSalvando(true);
      const novo = { id: `${Date.now()}`, nome: nome.trim(), endereco: selecionado.endereco, latitude: selecionado.latitude, longitude: selecionado.longitude, cor };
      await salvarLista([...enderecos, novo]);
      setNome(''); setBusca(''); setResultados([]); setSelecionado(null); setCor(CORES_MARCADOR[0]);
      Alert.alert('Endereço favoritado', `Agora você acompanha os riscos próximos de ${novo.nome}.`);
    } catch (erro) {
      console.error(erro);
      Alert.alert('Erro', 'Não foi possível salvar o endereço.');
    } finally { setSalvando(false); }
  };

  const excluir = item => Alert.alert('Remover favorito?', `Você deixará de acompanhar o endereço de ${item.nome}.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: async () => {
      try { await salvarLista(enderecos.filter(endereco => endereco.id !== item.id)); }
      catch (erro) { console.error(erro); Alert.alert('Erro', 'Não foi possível remover o endereço.'); }
    } },
  ]);

  const mudarCor = async (item, novaCor) => {
    try {
      await salvarLista(enderecos.map(endereco => endereco.id === item.id ? { ...endereco, cor: novaCor } : endereco));
    } catch (erro) {
      console.error(erro);
      Alert.alert('Erro', 'Não foi possível mudar a cor deste ponto.');
    }
  };

  const enderecosComRisco = useMemo(() => enderecos.map(endereco => ({
    ...endereco,
    riscos: alertas.filter(alerta => distanciaKm(endereco, alerta) <= (alerta.raioMetros || 1000) / 1000),
  })), [enderecos, alertas]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Pessoas e locais favoritos</Text>
      <Text style={styles.subtitle}>Acompanhe alertas ativos perto de pessoas importantes. Apenas você vê esta lista.</Text>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Adicionar endereço</Text>
        <TextInput style={styles.input} placeholder="Nome da pessoa (ex.: Maria)" placeholderTextColor={cores.placeholder} value={nome} onChangeText={setNome} />
        <View style={styles.searchRow}>
          <TextInput style={[styles.input, styles.searchInput]} placeholder="Rua, número, bairro ou local" placeholderTextColor={cores.placeholder} value={busca} onChangeText={texto => { setBusca(texto); setSelecionado(null); }} onSubmitEditing={pesquisar} />
          <TouchableOpacity style={styles.searchButton} onPress={pesquisar}><Text style={styles.searchButtonText}>{pesquisando ? '...' : 'Buscar'}</Text></TouchableOpacity>
        </View>
        {resultados.map(resultado => <TouchableOpacity key={resultado.id} style={[styles.result, selecionado?.id === resultado.id && styles.resultSelected]} onPress={() => { setSelecionado(resultado); setBusca(resultado.endereco); }}><Text style={styles.resultText}>📍 {resultado.endereco}</Text></TouchableOpacity>)}
        <Text style={styles.colorLabel}>Cor do ponto no mapa</Text>
        <View style={styles.colorRow}>{CORES_MARCADOR.map(item => <TouchableOpacity key={item} accessibilityLabel={`Selecionar cor ${item}`} style={[styles.colorChoice, { backgroundColor: item }, cor === item && styles.colorChoiceActive]} onPress={() => setCor(item)}>{cor === item && <Text escalavel={false} style={styles.colorCheck}>✓</Text>}</TouchableOpacity>)}</View>
        <TouchableOpacity style={[styles.saveButton, (!selecionado || salvando) && styles.disabled]} onPress={adicionar} disabled={!selecionado || salvando}><Text style={styles.saveButtonText}>{salvando ? 'Salvando...' : '⭐ Favoritar endereço'}</Text></TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Pessoas acompanhadas ({enderecos.length}/5)</Text>
      {!enderecosComRisco.length && <View style={styles.empty}><Text style={styles.emptyEmoji}>👥</Text><Text style={styles.emptyText}>Nenhuma pessoa adicionada.</Text></View>}
      {enderecosComRisco.map(item => <View key={item.id} style={[styles.card, item.riscos.length > 0 && styles.cardRisk]}>
        <View style={styles.cardHeader}><View style={[styles.markerPreview, { backgroundColor: item.cor || CORES_MARCADOR[0] }]} /><View style={{ flex: 1 }}><Text style={styles.familyName}>{item.nome}</Text><Text style={styles.address}>{item.endereco}</Text></View><TouchableOpacity onPress={() => excluir(item)}><Text style={styles.remove}>Remover</Text></TouchableOpacity></View>
        <Text style={styles.changeColorLabel}>Mudar a cor do ponto:</Text>
        <View style={styles.colorRow}>{CORES_MARCADOR.map(corItem => <TouchableOpacity key={corItem} style={[styles.smallColorChoice, { backgroundColor: corItem }, (item.cor || CORES_MARCADOR[0]) === corItem && styles.colorChoiceActive]} onPress={() => mudarCor(item, corItem)} />)}</View>
        {item.riscos.length > 0 ? <TouchableOpacity style={styles.riskBox} onPress={() => router.push(`/ocorrencia/${item.riscos[0].id}`)}><Text style={styles.riskTitle}>⚠️ {item.riscos.length} alerta(s) atingindo este local</Text><Text style={styles.riskText}>{item.riscos.map(risco => `${risco.tipo} (${risco.gravidade || 'Atenção'})`).join(', ')}</Text><Text style={styles.details}>Toque para ver os detalhes</Text></TouchableOpacity> : <Text style={styles.safe}>✓ Nenhum alerta ativo próximo deste endereço.</Text>}
      </View>)}
    </ScrollView>
  );
}

const locais = {
  light: { inputFundo: '#f8fafd', removerTexto: '#b3261e', riscoTexto: '#6d3a00' },
  dark: { inputFundo: '#18191b', removerTexto: '#f28b82', riscoTexto: '#f6c26b' },
};

const estilos = criarEstilos((c, tema) => {
  const l = locais[tema];
  return {
    container: { flex: 1, backgroundColor: c.screen }, content: { padding: 18, paddingBottom: 40 }, title: { color: c.textStrong, fontSize: 26, fontWeight: '900', marginTop: 12 }, subtitle: { color: c.textMuted, lineHeight: 20, marginTop: 5, marginBottom: 16 },
    form: { backgroundColor: c.surface, padding: 15, borderRadius: 17, borderWidth: 1, borderColor: c.borderSoft }, formTitle: { color: c.textStrong, fontSize: 17, fontWeight: '900', marginBottom: 10 }, input: { backgroundColor: l.inputFundo, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, marginBottom: 10, ...(tema === 'dark' ? { color: c.textStrong } : {}) },
    searchRow: { flexDirection: 'row', gap: 8 }, searchInput: { flex: 1 }, searchButton: { backgroundColor: c.button, borderRadius: 12, paddingHorizontal: 14, minHeight: 46, marginBottom: 10, justifyContent: 'center' }, searchButtonText: { color: c.onButton, fontWeight: '900' }, result: { padding: 11, borderRadius: 11, backgroundColor: c.surfaceMuted, marginBottom: 7, borderWidth: 1, borderColor: 'transparent' }, resultSelected: { backgroundColor: c.tintBackground, borderColor: c.tint }, resultText: { color: c.textSecondary, fontSize: 12, lineHeight: 17 },
    colorLabel: { color: c.textSecondary, fontWeight: '800', fontSize: 13, marginBottom: 8 }, colorRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }, colorChoice: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, smallColorChoice: { width: 26, height: 26, borderRadius: 13 }, colorChoiceActive: { borderWidth: 3, borderColor: c.textStrong }, colorCheck: { color: '#fff', fontWeight: '900' },
    saveButton: { backgroundColor: c.button, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 5 }, saveButtonText: { color: c.onButton, fontWeight: '900' }, disabled: { opacity: 0.45 }, sectionTitle: { color: c.textStrong, fontWeight: '900', fontSize: 17, marginTop: 22, marginBottom: 10 }, empty: { alignItems: 'center', backgroundColor: c.surface, borderRadius: 16, padding: 22 }, emptyEmoji: { fontSize: 36 }, emptyText: { color: c.textMuted, marginTop: 8 },
    card: { backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 11, borderWidth: 1, borderColor: c.borderSoft }, cardRisk: { borderColor: '#e8710a' }, cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, markerPreview: { width: 19, height: 19, borderRadius: 10, marginTop: 2, borderWidth: 2, borderColor: c.surface, elevation: 2 }, familyName: { color: c.textStrong, fontSize: 16, fontWeight: '900' }, address: { color: c.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4 }, remove: { color: l.removerTexto, fontSize: 11, fontWeight: '900' }, changeColorLabel: { color: c.textMuted, fontSize: 11, fontWeight: '800', marginTop: 11, marginBottom: 7 }, riskBox: { backgroundColor: c.warningBackground, borderRadius: 11, padding: 10, marginTop: 4 }, riskTitle: { color: c.warning, fontWeight: '900', fontSize: 12 }, riskText: { color: l.riscoTexto, fontSize: 11, marginTop: 3 }, details: { color: c.tint, fontSize: 11, fontWeight: '900', marginTop: 6 }, safe: { color: c.success, fontSize: 12, fontWeight: '800', marginTop: 4 },
  };
});
