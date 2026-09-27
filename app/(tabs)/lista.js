import { View, Text, FlatList, Image, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import app, { auth } from '../../services/firebaseConfig';
import styles from '../../styles/lista.styles';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { observarStatusAdministrador } from '../../services/accessControl';
import { GRAVIDADES, RAIOS_ALERTA, dadosGravidade, formatarRaio, orientacaoDoRisco } from '../../services/riskGuidance';

const db = getFirestore(app);

const PERIODOS = [
  { label: 'Todo período', dias: null },
  { label: 'Hoje', dias: 1 },
  { label: '7 dias', dias: 7 },
  { label: '30 dias', dias: 30 },
  { label: '90 dias', dias: 90 },
];

const TIPOS = ['Todos', 'Alagamento', 'Enchente', 'Deslizamento', 'Vendaval', 'Seca', 'Incêndio florestal'];

function emojiDoTipo(tipo) {
  const tipos = [
    { label: 'Alagamento', emoji: '🌊' },
    { label: 'Enchente', emoji: '🌧️' },
    { label: 'Deslizamento', emoji: '⛰️' },
    { label: 'Vendaval', emoji: '🌪️' },
    { label: 'Seca', emoji: '☀️' },
    { label: 'Incêndio florestal', emoji: '🔥' },
  ];
  return tipos.find(item => item.label === tipo)?.emoji || '📍';
}

export default function ListaAlertasScreen() {
  const router = useRouter();
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [descricaoEdicao, setDescricaoEdicao] = useState('');
  const [gravidadeEdicao, setGravidadeEdicao] = useState('Atenção');
  const [raioEdicao, setRaioEdicao] = useState(1000);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [bairroEdicao, setBairroEdicao] = useState('');
  const [periodoDias, setPeriodoDias] = useState(null);
  const [bairroFiltro, setBairroFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [gravidadeFiltro, setGravidadeFiltro] = useState('Todas');
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(true);

  useEffect(() => {
    let pararAdmin = () => {};
    const pararAuth = onAuthStateChanged(auth, user => {
      pararAdmin();
      pararAdmin = observarStatusAdministrador(user, autorizado => {
        if (!autorizado) router.replace('/mapa');
      });
    });
    return () => { pararAuth(); pararAdmin(); };
  }, [router]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'marcacoes'), snapshot => {
      const dados = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
      
      setAlertas(dados);
      setCarregando(false);
    }, erro => {
      console.error("Erro ao buscar lista:", erro);
      setCarregando(false);
    });

    return () => unsubscribe();
  }, []);

  const encerrarAlerta = item => Alert.alert(
    'Encerrar ocorrência',
    `Confirma que o alerta de ${item.tipo} foi resolvido?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', onPress: async () => {
        await updateDoc(doc(db, 'marcacoes', item.id), {
          status: 'encerrado',
          encerradoEm: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedAtMillis: Date.now(),
          encerradoPor: auth.currentUser?.email || null,
          historicoAdministrativo: arrayUnion({
            acao: 'Encerrou o alerta',
            adminEmail: auth.currentUser?.email || null,
            adminNome: auth.currentUser?.displayName || 'Administrador',
            dataMillis: Date.now(),
          }),
        });
      } },
    ],
  );

  const excluirAlerta = item => Alert.alert(
    'Excluir definitivamente',
    'Essa ação remove a ocorrência do histórico. Deseja continuar?',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteDoc(doc(db, 'marcacoes', item.id)) },
    ],
  );

  const abrirEdicao = item => {
    setEditando(item);
    setDescricaoEdicao(item.comentario || '');
    setGravidadeEdicao(item.gravidade || 'Atenção');
    setRaioEdicao(item.raioMetros || 1000);
    setBairroEdicao(item.bairro || '');
  };

  const salvarEdicao = async () => {
    if (!editando || !descricaoEdicao.trim()) return Alert.alert('Descrição obrigatória', 'Informe a situação atual do local.');
    if (!bairroEdicao.trim()) return Alert.alert('Bairro obrigatório', 'Informe o bairro da ocorrência.');
    try {
      setSalvandoEdicao(true);
      const expirou = !editando.expiresAt || editando.expiresAt <= Date.now() || editando.status === 'encerrado';
      await updateDoc(doc(db, 'marcacoes', editando.id), {
        comentario: descricaoEdicao.trim(),
        bairro: bairroEdicao.trim(),
        gravidade: gravidadeEdicao,
        raioMetros: raioEdicao,
        status: 'ativo',
        oficial: true,
        adminEmail: auth.currentUser?.email || editando.adminEmail || null,
        encerradoEm: null,
        expiresAt: expirou ? Date.now() + 60 * 60 * 1000 : editando.expiresAt,
        updatedAt: serverTimestamp(),
        updatedAtMillis: Date.now(),
        ultimoEditadoPor: auth.currentUser?.email || null,
        historicoAdministrativo: arrayUnion({
          acao: expirou ? 'Editou e reativou o alerta' : 'Editou o alerta',
          adminEmail: auth.currentUser?.email || null,
          adminNome: auth.currentUser?.displayName || 'Administrador',
          dataMillis: Date.now(),
        }),
      });
      setEditando(null);
      Alert.alert('Alerta atualizado', expirou ? 'A ocorrência foi atualizada e reativada por 1 hora.' : 'As alterações foram salvas.');
    } catch (erro) {
      console.error('Erro ao editar alerta:', erro);
      Alert.alert('Erro', 'Não foi possível atualizar o alerta.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const alertasFiltrados = useMemo(() => {
    const agora = Date.now();
    const bairroBuscado = bairroFiltro.trim().toLocaleLowerCase('pt-BR');
    const inicioPeriodo = periodoDias === null ? null : agora - periodoDias * 24 * 60 * 60 * 1000;

    return alertas.filter(item => {
      const data = item.createdAtMillis || 0;
      const correspondePeriodo = inicioPeriodo === null || data >= inicioPeriodo;
      const correspondeBairro = !bairroBuscado || (item.bairro || '').toLocaleLowerCase('pt-BR').includes(bairroBuscado);
      const correspondeTipo = tipoFiltro === 'Todos' || item.tipo === tipoFiltro;
      const correspondeGravidade = gravidadeFiltro === 'Todas' || (item.gravidade || 'Atenção') === gravidadeFiltro;
      return correspondePeriodo && correspondeBairro && correspondeTipo && correspondeGravidade;
    });
  }, [alertas, periodoDias, bairroFiltro, tipoFiltro, gravidadeFiltro]);

  const limparFiltros = () => {
    setPeriodoDias(null);
    setBairroFiltro('');
    setTipoFiltro('Todos');
    setGravidadeFiltro('Todas');
  };

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Histórico de alertas</Text>
            <Text style={styles.subtitle}>Ocorrências ativas, expiradas e encerradas</Text>
          </View>
          <TouchableOpacity style={styles.filterToggle} onPress={() => setFiltrosVisiveis(atual => !atual)}>
            <Text style={styles.filterToggleText}>⚙ Filtros</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filtrosVisiveis && (
        <View style={styles.filtersBox}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filtrar histórico</Text>
              <TouchableOpacity onPress={limparFiltros}><Text style={styles.clearFilters}>Limpar</Text></TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Período</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {PERIODOS.map(item => <TouchableOpacity key={item.label} onPress={() => setPeriodoDias(item.dias)} style={[styles.filterChip, periodoDias === item.dias && styles.filterChipActive]}><Text style={[styles.filterChipText, periodoDias === item.dias && styles.filterChipTextActive]}>{item.label}</Text></TouchableOpacity>)}
            </ScrollView>

            <Text style={styles.filterLabel}>Bairro</Text>
            <TextInput style={styles.filterInput} placeholder="Digite o nome do bairro" value={bairroFiltro} onChangeText={setBairroFiltro} />

            <Text style={styles.filterLabel}>Tipo de risco</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TIPOS.map(item => <TouchableOpacity key={item} onPress={() => setTipoFiltro(item)} style={[styles.filterChip, tipoFiltro === item && styles.filterChipActive]}><Text style={[styles.filterChipText, tipoFiltro === item && styles.filterChipTextActive]}>{item}</Text></TouchableOpacity>)}
            </ScrollView>

            <Text style={styles.filterLabel}>Gravidade</Text>
            <View style={styles.filterWrap}>
              {['Todas', ...GRAVIDADES.map(item => item.label)].map(item => <TouchableOpacity key={item} onPress={() => setGravidadeFiltro(item)} style={[styles.filterChip, gravidadeFiltro === item && styles.filterChipActive]}><Text style={[styles.filterChipText, gravidadeFiltro === item && styles.filterChipTextActive]}>{item}</Text></TouchableOpacity>)}
            </View>
            <Text style={styles.resultsCount}>{alertasFiltrados.length} de {alertas.length} ocorrência(s)</Text>
          </ScrollView>
        </View>
      )}

      {alertas.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhum risco detectado no momento!</Text>
        </View>
      ) : (
        <FlatList
          data={alertasFiltrados}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={styles.filteredEmpty}><Text style={styles.emptyText}>Nenhuma ocorrência corresponde aos filtros.</Text><TouchableOpacity onPress={limparFiltros}><Text style={styles.clearFilters}>Limpar filtros</Text></TouchableOpacity></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Imagem do Alerta enviado pelo Firebase Storage */}
              {item.fotoUrl ? (
                <Image source={{ uri: item.fotoUrl }} style={styles.cardImage} />
              ) : (
                <View style={styles.noImagePlaceholder}>
                  <Text style={{ fontSize: 32 }}>{emojiDoTipo(item.tipo)}</Text>
                  <Text style={styles.noImageText}>Sem foto anexada</Text>
                </View>
              )}

              {/* Descrições e Informações */}
              <View style={styles.cardContent}>
                <Text style={[styles.statusBadge, item.status === 'encerrado' || item.expiresAt <= Date.now() ? styles.statusClosed : styles.statusActive]}>
                  {item.status === 'encerrado' || item.expiresAt <= Date.now() ? 'ENCERRADO' : 'ATIVO'}
                </Text>
                <Text style={item.oficial === true ? styles.officialBadge : styles.previousBadge}>
                  {item.oficial === true ? '✓ ALERTA OFICIAL' : 'REGISTRO ANTERIOR'}
                </Text>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>{emojiDoTipo(item.tipo)} {item.tipo}</Text>
                  <Text style={styles.cardTime}>
                    Expira às {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                
                <Text style={styles.cardDescription}>{item.comentario}</Text>
                <Text style={styles.neighborhood}>📍 Bairro: {item.bairro || 'Não informado'}</Text>
                <View style={styles.riskRow}>
                  <Text style={[styles.riskBadge, { color: dadosGravidade(item.gravidade).cor }]}>
                    {dadosGravidade(item.gravidade).emoji} {item.gravidade || 'Atenção'}
                  </Text>
                  <Text style={styles.radiusText}>Área: {formatarRaio(item.raioMetros)}</Text>
                </View>
                <View style={styles.guidanceBox}>
                  <Text style={styles.guidanceTitle}>🛡️ Como se proteger</Text>
                  <Text style={styles.guidanceText}>{orientacaoDoRisco(item.tipo)}</Text>
                </View>
                
                <View style={styles.cardFooter}>
                  <Text style={styles.cardUser}>Relatado por: {item.userName}</Text>
                  <Text style={styles.cardDate}>Publicado em {new Date(item.createdAtMillis || Date.now()).toLocaleString('pt-BR')}</Text>
                  {item.updatedAtMillis > item.createdAtMillis && <Text style={styles.cardDate}>Atualizado em {new Date(item.updatedAtMillis).toLocaleString('pt-BR')}</Text>}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.detailsAction} onPress={() => router.push(`/ocorrencia/${item.id}`)}><Text style={styles.detailsActionText}>🔎 Detalhes</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.editAction} onPress={() => abrirEdicao(item)}><Text style={styles.editActionText}>✏️ Editar</Text></TouchableOpacity>
                  {item.status !== 'encerrado' && item.expiresAt > Date.now() && (
                    <TouchableOpacity style={styles.closeAction} onPress={() => encerrarAlerta(item)}><Text style={styles.closeActionText}>✓ Encerrar</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.deleteAction} onPress={() => excluirAlerta(item)}><Text style={styles.deleteActionText}>Excluir</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!editando} transparent animationType="slide" onRequestClose={() => setEditando(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Editar ocorrência</Text>
              <Text style={styles.modalLabel}>Descrição atual</Text>
              <TextInput style={styles.modalInput} multiline value={descricaoEdicao} onChangeText={setDescricaoEdicao} />

              <Text style={styles.modalLabel}>Bairro</Text>
              <TextInput style={styles.modalNeighborhoodInput} value={bairroEdicao} onChangeText={setBairroEdicao} placeholder="Bairro da ocorrência" />

              <Text style={styles.modalLabel}>Gravidade</Text>
              <View style={styles.optionsRow}>
                {GRAVIDADES.map(item => (
                  <TouchableOpacity key={item.label} onPress={() => setGravidadeEdicao(item.label)} style={[styles.option, gravidadeEdicao === item.label && { backgroundColor: item.cor }]}>
                    <Text style={[styles.optionText, gravidadeEdicao === item.label && styles.optionTextActive]}>{item.emoji} {item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Área afetada</Text>
              <View style={styles.optionsRow}>
                {RAIOS_ALERTA.map(item => (
                  <TouchableOpacity key={item.valor} onPress={() => setRaioEdicao(item.valor)} style={[styles.option, raioEdicao === item.valor && styles.optionSelected]}>
                    <Text style={[styles.optionText, raioEdicao === item.valor && styles.optionTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.reactivateNote}>Alertas encerrados ou expirados serão reativados por 1 hora ao salvar.</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setEditando(null)}><Text style={styles.modalCancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={salvarEdicao} disabled={salvandoEdicao}><Text style={styles.modalSaveText}>{salvandoEdicao ? 'Salvando...' : 'Salvar'}</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
