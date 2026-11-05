import { View, Text, FlatList, Image, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import app, { auth } from '../../services/firebaseConfig';
import styles from '../../styles/lista.styles';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { observarStatusAdministrador } from '../../services/accessControl';
import { GRAVIDADES, RAIOS_ALERTA, dadosGravidade, formatarRaio, orientacaoDoRisco } from '../../services/riskGuidance';
import { STATUS_ALERTA, dadosStatus, statusEfetivo } from '../../services/alertLifecycle';
import ScreenWrapper from '../../components/screen-wrapper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const db = getFirestore(app);

const PERIODOS = [
  { label: 'Todo período', dias: null },
  { label: 'Hoje', dias: 1 },
  { label: '7 dias', dias: 7 },
  { label: '30 dias', dias: 30 },
  { label: '90 dias', dias: 90 },
];

const TIPOS = ['Todos', 'Alagamento', 'Enchente', 'Deslizamento', 'Vendaval',  'Incêndio florestal'];

const ICONES_TIPO = {
  alagamento: 'waves',
  enchente: 'weather-pouring',
  deslizamento: 'terrain',
  vendaval: 'weather-windy',
  seca: 'weather-sunny',
  'incendio florestal': 'fire',
};

const ICONES_STATUS = {
  Todos: 'clipboard-list-outline',
  rascunho: 'file-document-edit-outline',
  ativo: 'alert-circle',
  monitoramento: 'eye',
  controlado: 'shield-check',
  encerrado: 'check-circle',
};

const ICONES_GRAVIDADE = {
  'Atenção': 'alert-circle-outline',
  'Alerta': 'alert',
  'Emergência': 'alert-octagon',
  'Grave': 'alert-octagon',
};

const normalizarTipo = (tipo) => {
  return String(tipo || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const IconeTipo = ({ tipo, size = 18, color = '#1a73e8' }) => {
  const tipoNormalizado = normalizarTipo(tipo);

  return (
    <MaterialCommunityIcons
      name={ICONES_TIPO[tipoNormalizado] || 'alert-circle-outline'}
      size={size}
      color={color}
    />
  );
};

const IconeStatus = ({ id, size = 14, color = '#1a73e8' }) => (
  <MaterialCommunityIcons name={ICONES_STATUS[id] || 'circle-outline'} size={size} color={color} />
);

const IconeGravidade = ({ label, size = 14, color = '#1a73e8' }) => (
  <MaterialCommunityIcons name={ICONES_GRAVIDADE[label] || 'alert-outline'} size={size} color={color} />
);

const obterTimestamp = (valor) => {
  if (typeof valor === 'number') return valor;
  if (valor instanceof Date) return valor.getTime();
  if (valor && typeof valor.toMillis === 'function') {
    return valor.toMillis();
  }
  return 0;
};

const obterDataAtual = () => Date.now();

export default function ListaAlertasScreen() {
  const router = useRouter();
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [alterandoStatus, setAlterandoStatus] = useState(null);
  const [descricaoEdicao, setDescricaoEdicao] = useState('');
  const [gravidadeEdicao, setGravidadeEdicao] = useState('Atenção');
  const [raioEdicao, setRaioEdicao] = useState(1000);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [bairroEdicao, setBairroEdicao] = useState('');
  const [statusEdicao, setStatusEdicao] = useState('ativo');
  const [periodoDias, setPeriodoDias] = useState(null);
  const [bairroFiltro, setBairroFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [gravidadeFiltro, setGravidadeFiltro] = useState('Todas');
  const [statusFiltro, setStatusFiltro] = useState('Todos');
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [administrador, setAdministrador] = useState(false);

  useEffect(() => {
    let pararAdmin = () => {};
    const pararAuth = onAuthStateChanged(auth, user => {
      pararAdmin();
      pararAdmin = observarStatusAdministrador(user, setAdministrador);
    });
    return () => { pararAuth(); pararAdmin(); };
  }, [router]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'marcacoes'), snapshot => {
      const dados = snapshot.docs
        .map(documento => ({
          id: documento.id,
          ...documento.data(),
        }))
        .sort((a, b) =>
          obterTimestamp(b.createdAtMillis || b.createdAt) -
          obterTimestamp(a.createdAtMillis || a.createdAt)
        );
      
      setAlertas(dados);
      setCarregando(false);
    }, erro => {
      console.error("Erro ao buscar lista:", erro);
      setCarregando(false);
    });

    return () => unsubscribe();
  }, []);

  const atualizarStatus = async (item, novoStatus) => {
    if (!administrador) {
      Alert.alert('Acesso restrito', 'Somente administradores podem alterar alertas.');
      return;
    }
    const agora = Date.now();
    const anterior = statusEfetivo(item);
    if (anterior === novoStatus) return;
    const novo = dadosStatus(novoStatus);
    const precisaValidade = ['ativo', 'monitoramento'].includes(novoStatus);
    const validadeAtual = item.expiresAt && item.expiresAt > agora ? item.expiresAt : null;
    const expiresAt = precisaValidade ? (validadeAtual || agora + (item.duracaoMillis || 60 * 60 * 1000)) : item.expiresAt || null;

    await updateDoc(doc(db, 'marcacoes', item.id), {
      status: novoStatus,
      oficial: novoStatus !== 'rascunho',
      expiresAt: novoStatus === 'rascunho' ? null : expiresAt,
      statusAtualizadoEm: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedAtMillis: agora,
      ultimoEditadoPor: auth.currentUser?.email || null,
      ...(novoStatus === 'ativo' ? { publicadoEm: serverTimestamp() } : {}),
      ...(novoStatus === 'monitoramento' ? { monitoramentoEm: serverTimestamp() } : {}),
      ...(novoStatus === 'controlado' ? { controladoEm: serverTimestamp() } : {}),
      ...(novoStatus === 'encerrado' ? { encerradoEm: serverTimestamp(), encerradoPor: auth.currentUser?.email || null } : {}),
      historicoAdministrativo: arrayUnion({
        acao: `Alterou o estado de ${dadosStatus(anterior).label} para ${novo.label}`,
        statusAnterior: anterior,
        statusNovo: novoStatus,
        adminEmail: auth.currentUser?.email || null,
        adminNome: auth.currentUser?.displayName || 'Administrador',
        dataMillis: agora,
      }),
    });
  };

  const escolherStatus = (item, novoStatus) => {
    const atual = statusEfetivo(item);
    if (atual === novoStatus) {
      setAlterandoStatus(null);
      return;
    }
    const destino = dadosStatus(novoStatus);
    Alert.alert(
      `Alterar para “${destino.label}”`,
      `A ocorrência de ${item.tipo} está como “${dadosStatus(atual).label}”. Deseja alterar para “${destino.label}”?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: async () => {
          try {
            await atualizarStatus(item, novoStatus);
            setAlterandoStatus(null);
            Alert.alert('Situação atualizada', `A ocorrência agora está “${destino.label}”.`);
          } catch (erro) {
            console.error('Erro ao alterar estado:', erro);
            Alert.alert('Erro', 'Não foi possível alterar o estado da ocorrência.');
          }
        } },
      ],
    );
  };

  const excluirAlerta = (item) => {
  if (!administrador) {
    Alert.alert(
      'Acesso restrito',
      'Somente administradores podem excluir alertas.'
    );
    return;
  }

  Alert.alert(
    'Excluir definitivamente',
    'Essa ação remove a ocorrência do histórico. Deseja continuar?',
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'marcacoes', item.id));

            Alert.alert(
              'Ocorrência excluída',
              'O registro foi removido com sucesso.'
            );
          } catch (erro) {
            console.error('Erro ao excluir alerta:', erro);

            Alert.alert(
              'Erro',
              'Não foi possível excluir a ocorrência.'
            );
          }
        },
      },
    ]
  );
};

  const abrirEdicao = item => {
    if (!administrador) {
      Alert.alert('Acesso restrito', 'Somente administradores podem editar alertas.');
      return;
    }
    setEditando(item);
    setDescricaoEdicao(item.comentario || '');
    setGravidadeEdicao(item.gravidade || 'Atenção');
    setRaioEdicao(item.raioMetros || 1000);
    setBairroEdicao(item.bairro || '');
    setStatusEdicao(statusEfetivo(item));
  };

  const salvarEdicao = async () => {
    if (!administrador) {
      Alert.alert('Acesso restrito', 'Somente administradores podem editar alertas.');
      return;
    }
    if (!editando || !descricaoEdicao.trim()) return Alert.alert('Descrição obrigatória', 'Informe a situação atual do local.');
    if (!bairroEdicao.trim()) return Alert.alert('Bairro obrigatório', 'Informe o bairro da ocorrência.');
    try {
      setSalvandoEdicao(true);
      const agora = obterDataAtual();
      const statusAnterior = statusEfetivo(editando);
      const precisaValidade = ['ativo', 'monitoramento'].includes(statusEdicao);

      const validadeAtual = obterTimestamp(editando.expiresAt);

      const expiresAt = statusEdicao === 'rascunho'
        ? null
        : precisaValidade
          ? (validadeAtual > agora
              ? validadeAtual
              : agora + (editando.duracaoMillis || 60 * 60 * 1000))
          : editando.expiresAt || null;
      await updateDoc(doc(db, 'marcacoes', editando.id), {
        comentario: descricaoEdicao.trim(),
        bairro: bairroEdicao.trim(),
        gravidade: gravidadeEdicao,
        raioMetros: raioEdicao,
        status: statusEdicao,
        oficial: statusEdicao !== 'rascunho',
        adminEmail: auth.currentUser?.email || editando.adminEmail || null,
        expiresAt,
        updatedAt: serverTimestamp(),
        updatedAtMillis: Date.now(),
        ultimoEditadoPor: auth.currentUser?.email || null,
        historicoAdministrativo: arrayUnion({
          acao: statusAnterior === statusEdicao ? 'Editou a ocorrência' : `Editou e alterou o estado de ${dadosStatus(statusAnterior).label} para ${dadosStatus(statusEdicao).label}`,
          statusAnterior,
          statusNovo: statusEdicao,
          adminEmail: auth.currentUser?.email || null,
          adminNome: auth.currentUser?.displayName || 'Administrador',
          dataMillis: Date.now(),
        }),
      });
      setEditando(null);
      Alert.alert('Ocorrência atualizada', `Alterações salvas com o estado “${dadosStatus(statusEdicao).label}”.`);
    } catch (erro) {
      console.error('Erro ao editar alerta:', erro);
      Alert.alert('Erro', 'Não foi possível atualizar o alerta.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const alertasFiltrados = useMemo(() => {
    const agora = obterDataAtual();
    const bairroBuscado = bairroFiltro.trim().toLocaleLowerCase('pt-BR');

    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);

    const inicioPeriodo = periodoDias === null
      ? null
      : periodoDias === 1
        ? inicioHoje.getTime()
        : agora - periodoDias * 24 * 60 * 60 * 1000;

    return alertas.filter(item => {
      // Rascunhos são privados; visitantes e usuários veem alertas publicados e históricos.
      if (!administrador && statusEfetivo(item) === 'rascunho') return false;
      const data = obterTimestamp(item.createdAtMillis || item.createdAt);
      const correspondePeriodo = inicioPeriodo === null || data >= inicioPeriodo;
      const correspondeBairro = !bairroBuscado || (item.bairro || '').toLocaleLowerCase('pt-BR').includes(bairroBuscado);
      const correspondeTipo = tipoFiltro === 'Todos' || item.tipo === tipoFiltro;
      const correspondeGravidade = gravidadeFiltro === 'Todas' || (item.gravidade || 'Atenção') === gravidadeFiltro;
      const correspondeStatus = statusFiltro === 'Todos' || statusEfetivo(item) === statusFiltro;
      return correspondePeriodo && correspondeBairro && correspondeTipo && correspondeGravidade && correspondeStatus;
    });
  }, [alertas, periodoDias, bairroFiltro, tipoFiltro, gravidadeFiltro, statusFiltro, administrador]);

  const limparFiltros = () => {
    setPeriodoDias(null);
    setBairroFiltro('');
    setTipoFiltro('Todos');
    setGravidadeFiltro('Todas');
    setStatusFiltro('Todos');
  };

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  const cabecalho = (
    <View>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Histórico de alertas</Text>
            <Text style={styles.subtitle}>Todos podem consultar; somente administradores podem editar ou excluir.</Text>
          </View>
          <TouchableOpacity
            style={[styles.filterToggle, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            onPress={() => setFiltrosVisiveis(atual => !atual)}
          >
            <Ionicons name="options" size={16} color="#1a73e8" />
            <Text style={styles.filterToggleText}>Filtros</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filtrosVisiveis && (
        <View style={styles.filtersBox}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filtrar histórico</Text>
            <TouchableOpacity onPress={limparFiltros}><Text style={styles.clearFilters}>Limpar</Text></TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>Período</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ flexGrow: 0 }}
          >
            {PERIODOS.map(item => <TouchableOpacity key={item.label} onPress={() => setPeriodoDias(item.dias)} style={[styles.filterChip, periodoDias === item.dias && styles.filterChipActive]}><Text style={[styles.filterChipText, periodoDias === item.dias && styles.filterChipTextActive]}>{item.label}</Text></TouchableOpacity>)}
          </ScrollView>

          <Text style={styles.filterLabel}>Bairro</Text>
          <TextInput style={styles.filterInput} placeholder="Digite o nome do bairro" value={bairroFiltro} onChangeText={setBairroFiltro} />

          <Text style={styles.filterLabel}>Tipo de risco</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ flexGrow: 0 }}
          >
            {TIPOS.map(item => <TouchableOpacity key={item} onPress={() => setTipoFiltro(item)} style={[styles.filterChip, tipoFiltro === item && styles.filterChipActive]}><Text style={[styles.filterChipText, tipoFiltro === item && styles.filterChipTextActive]}>{item}</Text></TouchableOpacity>)}
          </ScrollView>

          <Text style={styles.filterLabel}>Gravidade</Text>
          <View style={styles.filterWrap}>
            {['Todas', ...GRAVIDADES.map(gravidade => gravidade.label)].map(gravidade => {
              const selecionado = gravidadeFiltro === gravidade;

              return (
                <TouchableOpacity
                  key={gravidade}
                  onPress={() => setGravidadeFiltro(gravidade)}
                  style={[
                    styles.filterChip,
                    selecionado && styles.filterChipActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: selecionado ? '#FFFFFF' : '#3c4043',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {String(gravidade)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.filterLabel}>Estado da ocorrência</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ flexGrow: 0 }}
          >
            {[{ id: 'Todos', label: 'Todos' }, ...STATUS_ALERTA].map(item => {
              const ativo = statusFiltro === item.id;
              return (
                <TouchableOpacity key={item.id} onPress={() => setStatusFiltro(item.id)} style={[styles.filterChip, ativo && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, ativo && styles.filterChipTextActive]}>
                    <IconeStatus id={item.id} color={ativo ? '#fff' : '#5f6368'} /> {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.resultsCount}>{alertasFiltrados.length} de {alertas.length} ocorrência(s)</Text>
        </View>
      )}
    </View>
  );

  return (
    <ScreenWrapper includeTop={false} includeBottom={false} dismissOnPress={false}>
      <FlatList
        data={alertasFiltrados}
        keyExtractor={item => item.id}
        ListHeaderComponent={cabecalho}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <View style={styles.filteredEmpty}>
            <Text style={styles.emptyText}>Nenhum alerta corresponde aos filtros selecionados.</Text>
            <TouchableOpacity onPress={limparFiltros}><Text style={styles.clearFilters}>Limpar filtros</Text></TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const statusAtual = statusEfetivo(item);
          const statusDados = dadosStatus(statusAtual);
          const gravidadeDados = dadosGravidade(item.gravidade);
          return (
            <View style={styles.card}>
              {item.fotoUrl ? (
                <Image source={{ uri: item.fotoUrl }} style={styles.cardImage} />
              ) : (
                <View style={styles.noImagePlaceholder}>
                  <IconeTipo tipo={item.tipo} size={32} />
                  <Text style={styles.noImageText}>Sem foto anexada</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <Text style={[styles.statusBadge, { color: statusDados.cor, backgroundColor: statusDados.fundo }]}>
                  <IconeStatus id={statusAtual} color={statusDados.cor} /> {statusDados.label.toUpperCase()}
                </Text>
                <Text style={item.oficial === true ? styles.officialBadge : styles.previousBadge}>
                  {statusAtual === 'rascunho'
                    ? <><MaterialCommunityIcons name="file-document-edit-outline" size={13} color="#5f6368" /> NÃO PUBLICADO</>
                    : item.oficial === true
                      ? <><Ionicons name="checkmark-circle" size={13} color="#188038" /> ALERTA OFICIAL</>
                      : 'REGISTRO ANTERIOR'}
                </Text>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}><IconeTipo tipo={item.tipo} size={18} /> {item.tipo}</Text>
                  {item.expiresAt ? <Text style={styles.cardTime}>Expira às {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text> : <Text style={styles.cardTime}>Sem publicação</Text>}
                </View>

                <Text style={styles.cardDescription}>{item.comentario}</Text>
                <Text style={styles.neighborhood}><Ionicons name="location" size={14} color="#1a73e8" /> Bairro: {item.bairro || 'Não informado'}</Text>
                <View style={styles.riskRow}>
                  <Text style={styles.optionText}>
                    <IconeGravidade
                      label={item.gravidade || 'Atenção'}
                      color="#5f6368"
                    />{' '}
                    {gravidadeDados.label || item.gravidade || 'Atenção'}
                  </Text>

                  <Text style={styles.radiusText}>
                    Área: {formatarRaio(item.raioMetros)}
                  </Text>
                </View>
                <View style={styles.guidanceBox}>
                  <Text style={styles.guidanceTitle}><Ionicons name="shield-checkmark" size={15} color="#1a73e8" /> Como se proteger</Text>
                  <Text style={styles.guidanceText}>{orientacaoDoRisco(item.tipo)}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardUser}>Relatado por: {item.userName}</Text>
                  <Text style={styles.cardDate}>Publicado em {new Date(item.createdAtMillis || Date.now()).toLocaleString('pt-BR')}</Text>
                  {item.updatedAtMillis > item.createdAtMillis && <Text style={styles.cardDate}>Atualizado em {new Date(item.updatedAtMillis).toLocaleString('pt-BR')}</Text>}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.detailsAction, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]} onPress={() => router.push(`/ocorrencia/${item.id}`)}>
                    <Ionicons name="search" size={16} color="#1a73e8" />
                    <Text style={styles.detailsActionText}>Detalhes</Text>
                  </TouchableOpacity>
                  {administrador && <>
                    <TouchableOpacity style={[styles.editAction, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]} onPress={() => abrirEdicao(item)}>
                      <Ionicons name="create-outline" size={16} color="#1a73e8" />
                      <Text style={styles.editActionText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.closeAction, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]} onPress={() => setAlterandoStatus(item)}>
                      <MaterialCommunityIcons name="swap-horizontal" size={16} color="#1a73e8" />
                      <Text style={styles.closeActionText}>Alterar situação</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.deleteAction, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]} onPress={() => excluirAlerta(item)}>
                      <Ionicons name="trash-outline" size={16} color="#d93025" />
                      <Text style={styles.deleteActionText}>Excluir</Text>
                    </TouchableOpacity>
                  </>}
                </View>
              </View>
            </View>
          );
        }}
        />

      <Modal visible={administrador && !!alterandoStatus} transparent animationType="fade" onRequestClose={() => setAlterandoStatus(null)}>
        <View style={styles.statusModalOverlay}>
          <View style={styles.statusModalBox}>
            <Text style={styles.modalTitle}>Alterar situação</Text>
            <Text style={styles.statusModalSubtitle}>
              {alterandoStatus && (
                <>
                  <Text style={styles.modalTitle}>Alterar situação</Text>

                  <Text style={styles.statusModalSubtitle}>
                    {alterandoStatus.tipo} · situação atual:{' '}
                    {dadosStatus(statusEfetivo(alterandoStatus)).label}
                  </Text>

                  {STATUS_ALERTA.map(item => {
                    const selecionado =
                      statusEfetivo(alterandoStatus) === item.id;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => escolherStatus(alterandoStatus, item.id)}
                        style={[
                          styles.statusChoice,
                          selecionado && {
                            borderColor: item.cor,
                            backgroundColor: item.fundo,
                          },
                        ]}
                      >
                        <IconeStatus
                          id={item.id}
                          size={22}
                          color={item.cor}
                        />

                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.statusChoiceLabel,
                              selecionado && { color: item.cor },
                            ]}
                          >
                            {item.label}
                          </Text>

                          <Text style={styles.statusChoiceDescription}>
                            {item.id === 'rascunho'
                              ? 'Não aparece para os usuários.'
                              : item.id === 'ativo'
                                ? 'Risco confirmado e publicado no mapa.'
                                : item.id === 'monitoramento'
                                  ? 'Continua visível enquanto é acompanhado.'
                                  : item.id === 'controlado'
                                    ? 'Risco contido e retirado do mapa.'
                                    : 'Atendimento concluído e arquivado.'}
                          </Text>
                        </View>

                        {selecionado && (
                          <Text style={[styles.statusCurrentMark, { color: item.cor }]}>
                            ATUAL
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    style={styles.statusCancel}
                    onPress={() => setAlterandoStatus(null)}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              )}
            </Text>
            {STATUS_ALERTA.map(item => {
              const selecionado = statusEfetivo(alterandoStatus) === item.id;
              return <TouchableOpacity key={item.id} onPress={() => escolherStatus(alterandoStatus, item.id)} style={[styles.statusChoice, selecionado && { borderColor: item.cor, backgroundColor: item.fundo }]}>
                <IconeStatus id={item.id} size={22} color={item.cor} />
                <View style={{ flex: 1 }}><Text style={[styles.statusChoiceLabel, selecionado && { color: item.cor }]}>{item.label}</Text><Text style={styles.statusChoiceDescription}>{item.id === 'rascunho' ? 'Não aparece para os usuários.' : item.id === 'ativo' ? 'Risco confirmado e publicado no mapa.' : item.id === 'monitoramento' ? 'Continua visível enquanto é acompanhado.' : item.id === 'controlado' ? 'Risco contido e retirado do mapa.' : 'Atendimento concluído e arquivado.'}</Text></View>
                {selecionado && <Text style={[styles.statusCurrentMark, { color: item.cor }]}>ATUAL</Text>}
              </TouchableOpacity>;
            })}
            <TouchableOpacity style={styles.statusCancel} onPress={() => setAlterandoStatus(null)}><Text style={styles.modalCancelText}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={administrador && !!editando} transparent animationType="slide" onRequestClose={() => setEditando(null)}>
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

              <Text style={styles.modalLabel}>Estado da ocorrência</Text>
              <View style={styles.optionsRow}>
                {STATUS_ALERTA.map(item => <TouchableOpacity key={item.id} onPress={() => setStatusEdicao(item.id)} style={[styles.option, statusEdicao === item.id && { backgroundColor: item.cor }]}><Text style={[styles.optionText, statusEdicao === item.id && styles.optionTextActive]}>{item.emoji} {item.label}</Text></TouchableOpacity>)}
              </View>

              <Text style={styles.reactivateNote}>Somente ocorrências ativas ou em monitoramento aparecem no mapa. Toda mudança fica registrada no histórico administrativo.</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setEditando(null)}><Text style={styles.modalCancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={salvarEdicao} disabled={salvandoEdicao}><Text style={styles.modalSaveText}>{salvandoEdicao ? 'Salvando...' : 'Salvar'}</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}
