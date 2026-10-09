import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Linking, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import app, { auth } from '../../services/firebaseConfig';
import { observarStatusAdministrador } from '../../services/accessControl';
import { distanciaKm } from '../../services/proximityNotifications';
import { pesquisarEnderecos } from '../../services/addressSearch';
import { uploadImage } from '../../services/imageUpload';
import styles from '../../styles/abrigos.styles';

const db = getFirestore(app);

const CATEGORIAS = ['Todos', 'Abrigo temporário', 'Ponto seguro', 'Ponto de apoio'];
const SITUACOES = ['Aberto', 'Lotado', 'Fechado'];
const RECURSOS = ['Água', 'Alimentação', 'Banheiro', 'Atendimento médico'];

const FORMULARIO_VAZIO = {
  nome: '', categoria: 'Abrigo temporário', situacao: 'Aberto', endereco: '', telefone: '',
  horario: '', capacidade: '', acessivel: false, aceitaAnimais: false, recursos: [], fotoUrl: null,
  latitude: null, longitude: null,
};

function corSituacao(situacao) {
  if (situacao === 'Aberto') return '#137333';
  if (situacao === 'Lotado') return '#e8710a';
  return '#c5221f';
}

export default function AbrigosScreen() {
  const [abrigos, setAbrigos] = useState([]);
  const [localizacao, setLocalizacao] = useState(null);
  const [filtro, setFiltro] = useState('Todos');
  const [modalVisivel, setModalVisivel] = useState(false);
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [buscaEndereco, setBuscaEndereco] = useState('');
  const [resultadosEndereco, setResultadosEndereco] = useState([]);
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [administrador, setAdministrador] = useState(false);

  useEffect(() => {
    let pararAdmin = () => {};
    const pararAuth = onAuthStateChanged(auth, user => {
      pararAdmin();
      pararAdmin = observarStatusAdministrador(user, setAdministrador);
    });
    return () => { pararAuth(); pararAdmin(); };
  }, []);

  useEffect(() => onSnapshot(collection(db, 'abrigos'), snapshot => {
    setAbrigos(snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() })));
  }, erro => console.error('Erro ao carregar abrigos:', erro)), []);

  useEffect(() => {
    const carregarLocalizacao = async () => {
      const permissao = await Location.requestForegroundPermissionsAsync();
      if (!permissao.granted) return;
      const posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocalizacao({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude });
    };
    carregarLocalizacao().catch(erro => console.error('Erro na localização dos abrigos:', erro));
  }, []);

  const lista = useMemo(() => abrigos
    .filter(item => filtro === 'Todos' || item.categoria === filtro)
    .map(item => ({
      ...item,
      distancia: localizacao && item.latitude && item.longitude ? distanciaKm(localizacao, item) : null,
    }))
    .sort((a, b) => {
      if (a.situacao === 'Aberto' && b.situacao !== 'Aberto') return -1;
      if (a.situacao !== 'Aberto' && b.situacao === 'Aberto') return 1;
      return (a.distancia ?? Infinity) - (b.distancia ?? Infinity);
    }), [abrigos, filtro, localizacao]);

  const alterarCampo = (campo, valor) => setFormulario(atual => ({ ...atual, [campo]: valor }));

  const pesquisarEndereco = async () => {
    if (buscaEndereco.trim().length < 3) return Alert.alert('Pesquisa curta', 'Digite pelo menos 3 letras do nome ou endereço.');
    try {
      setBuscandoEndereco(true);
      const resultados = await pesquisarEnderecos(buscaEndereco);
      setResultadosEndereco(resultados);
      if (!resultados.length) Alert.alert('Nenhum resultado', 'Tente incluir a cidade ou o estado na pesquisa.');
    } catch (erro) {
      console.error('Erro ao pesquisar endereço:', erro);
      Alert.alert('Pesquisa indisponível', 'Não foi possível pesquisar agora. Verifique sua internet e tente novamente.');
    } finally {
      setBuscandoEndereco(false);
    }
  };

  const selecionarEndereco = resultado => {
    setFormulario(atual => ({
      ...atual,
      endereco: resultado.endereco,
      latitude: resultado.latitude,
      longitude: resultado.longitude,
    }));
    setBuscaEndereco(resultado.endereco);
    setResultadosEndereco([]);
  };

  const alternarRecurso = recurso => setFormulario(atual => ({
    ...atual,
    recursos: atual.recursos.includes(recurso)
      ? atual.recursos.filter(item => item !== recurso)
      : [...atual.recursos, recurso],
  }));

  const abrirNovo = () => {
    setEditandoId(null);
    setFormulario(FORMULARIO_VAZIO);
    setBuscaEndereco('');
    setResultadosEndereco([]);
    setModalVisivel(true);
  };

  const abrirEdicao = abrigo => {
    setEditandoId(abrigo.id);
    setFormulario({ ...FORMULARIO_VAZIO, ...abrigo, recursos: abrigo.recursos || [] });
    setBuscaEndereco(abrigo.endereco || '');
    setResultadosEndereco([]);
    setModalVisivel(true);
  };

  const escolherFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) return Alert.alert('Permissão necessária', 'Autorize o acesso às imagens.');
    const resultado = await ImagePicker.launchImageLibraryAsync({ quality: 0.2, allowsEditing: true, aspect: [16, 9] });
    if (!resultado.canceled) alterarCampo('fotoUrl', resultado.assets[0].uri);
  };

  const tirarFoto = async () => {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) return Alert.alert('Permissão necessária', 'Autorize o acesso à câmera.');
    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.2, allowsEditing: true, aspect: [16, 9] });
    if (!resultado.canceled) alterarCampo('fotoUrl', resultado.assets[0].uri);
  };

  const salvarAbrigo = async () => {
    if (!administrador) return Alert.alert('Acesso negado', 'Somente administradores podem cadastrar abrigos.');
    if (!formulario.nome.trim() || !formulario.endereco.trim()) return Alert.alert('Campos obrigatórios', 'Informe o nome e o endereço do local.');
    if (!formulario.latitude || !formulario.longitude) return Alert.alert('Selecione o endereço', 'Pesquise o local e toque em um dos resultados para registrar a posição correta no mapa.');

    try {
      setSalvando(true);
      let fotoUrl = formulario.fotoUrl;
      if (fotoUrl && !fotoUrl.startsWith('data:') && !fotoUrl.startsWith('http')) {
        fotoUrl = await uploadImage(fotoUrl, `abrigos/${auth.currentUser.uid}/${Date.now()}.jpg`);
      }

      const dados = {
        nome: formulario.nome.trim(), categoria: formulario.categoria, situacao: formulario.situacao,
        endereco: formulario.endereco.trim(), telefone: formulario.telefone.trim(), horario: formulario.horario.trim(),
        capacidade: Number(formulario.capacidade) || 0, acessivel: formulario.acessivel,
        aceitaAnimais: formulario.aceitaAnimais, recursos: formulario.recursos, fotoUrl,
        latitude: formulario.latitude, longitude: formulario.longitude,
        atualizadoEm: serverTimestamp(), atualizadoEmMillis: Date.now(), adminEmail: auth.currentUser?.email || null,
      };

      if (editandoId) {
        await updateDoc(doc(db, 'abrigos', editandoId), dados);
      } else {
        await addDoc(collection(db, 'abrigos'), { ...dados, criadoEm: serverTimestamp(), criadoEmMillis: Date.now() });
      }
      setModalVisivel(false);
      Alert.alert('Pronto', editandoId ? 'Abrigo atualizado.' : 'Abrigo cadastrado.');
    } catch (erro) {
      console.error('Erro ao salvar abrigo:', erro);
      Alert.alert('Erro', 'Não foi possível salvar. Confira o endereço e as regras do Firebase.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirAbrigo = abrigo => Alert.alert('Excluir abrigo', `Deseja excluir ${abrigo.nome}?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: () => deleteDoc(doc(db, 'abrigos', abrigo.id)) },
  ]);

  const abrirRota = async abrigo => {
    const destino = abrigo.latitude && abrigo.longitude
      ? `${abrigo.latitude},${abrigo.longitude}`
      : encodeURIComponent(abrigo.endereco);
    await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destino}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Abrigos e pontos seguros</Text>
        <Text style={styles.subtitle}>Locais oficiais de proteção e apoio</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {CATEGORIAS.map(categoria => (
          <TouchableOpacity key={categoria} onPress={() => setFiltro(categoria)} style={[styles.filterChip, filtro === categoria && styles.filterChipActive]}>
            <Text style={[styles.filterText, filtro === categoria && styles.filterTextActive]}>{categoria}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={lista}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum local cadastrado nesta categoria.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.fotoUrl ? <Image source={{ uri: item.fotoUrl }} style={styles.image} /> : <View style={styles.placeholder}><Text style={styles.placeholderIcon}>🏠</Text></View>}
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={[styles.status, { color: corSituacao(item.situacao) }]}>{item.situacao}</Text>
              </View>
              <Text style={styles.category}>{item.categoria}</Text>
              <Text style={styles.address}>📍 {item.endereco}</Text>
              {item.distancia !== null && <Text style={styles.distance}>{item.distancia.toFixed(1)} km da sua localização</Text>}
              {!!item.horario && <Text style={styles.info}>🕐 {item.horario}</Text>}
              {!!item.telefone && <Text style={styles.info}>☎️ {item.telefone}</Text>}
              <Text style={styles.info}>👥 Capacidade aproximada: {item.capacidade || 'não informada'}</Text>
              <View style={styles.tags}>
                {item.acessivel && <Text style={styles.tag}>♿ Acessível</Text>}
                {item.aceitaAnimais && <Text style={styles.tag}>🐾 Aceita animais</Text>}
                {(item.recursos || []).map(recurso => <Text key={recurso} style={styles.tag}>{recurso}</Text>)}
              </View>
              <TouchableOpacity style={styles.routeButton} onPress={() => abrirRota(item)}><Text style={styles.routeText}>🧭 Abrir rota</Text></TouchableOpacity>
              {administrador && <View style={styles.adminActions}>
                <TouchableOpacity style={styles.editButton} onPress={() => abrirEdicao(item)}><Text style={styles.editText}>Editar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => excluirAbrigo(item)}><Text style={styles.deleteText}>Excluir</Text></TouchableOpacity>
              </View>}
            </View>
          </View>
        )}
      />

      {administrador && <TouchableOpacity style={styles.addButton} onPress={abrirNovo}><Text style={styles.addText}>＋</Text></TouchableOpacity>}

      <Modal visible={modalVisivel} transparent animationType="slide" onRequestClose={() => setModalVisivel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editandoId ? 'Editar local' : 'Cadastrar local seguro'}</Text>
              <TextInput style={styles.input} placeholder="Nome do local" value={formulario.nome} onChangeText={valor => alterarCampo('nome', valor)} />
              <Text style={styles.label}>Localização do abrigo</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Nome do local, rua, número e cidade"
                value={buscaEndereco}
                onChangeText={valor => {
                  setBuscaEndereco(valor);
                  setResultadosEndereco([]);
                  setFormulario(atual => ({ ...atual, endereco: '', latitude: null, longitude: null }));
                }}
                onSubmitEditing={pesquisarEndereco}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchButton} onPress={pesquisarEndereco} disabled={buscandoEndereco}>
                <Text style={styles.searchButtonText}>{buscandoEndereco ? 'Pesquisando...' : '🔎 Pesquisar endereço'}</Text>
              </TouchableOpacity>
              {resultadosEndereco.map(resultado => (
                <TouchableOpacity key={resultado.id} style={styles.searchResult} onPress={() => selecionarEndereco(resultado)}>
                  <Text style={styles.searchResultIcon}>📍</Text>
                  <View style={styles.searchResultBody}>
                    <Text style={styles.searchResultText}>{resultado.endereco}</Text>
                    <Text style={styles.searchResultHint}>Toque para selecionar</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {!!formulario.latitude && !!formulario.longitude && (
                <View style={styles.selectedAddress}>
                  <Text style={styles.selectedAddressTitle}>✓ Endereço selecionado</Text>
                  <Text style={styles.selectedAddressText}>{formulario.endereco}</Text>
                </View>
              )}
              <Text style={styles.attribution}>Pesquisa de locais © OpenStreetMap contributors</Text>

              <Text style={styles.label}>Categoria</Text>
              <View style={styles.options}>{CATEGORIAS.slice(1).map(item => <TouchableOpacity key={item} onPress={() => alterarCampo('categoria', item)} style={[styles.option, formulario.categoria === item && styles.optionActive]}><Text style={[styles.optionText, formulario.categoria === item && styles.optionTextActive]}>{item}</Text></TouchableOpacity>)}</View>

              <Text style={styles.label}>Situação atual</Text>
              <View style={styles.options}>{SITUACOES.map(item => <TouchableOpacity key={item} onPress={() => alterarCampo('situacao', item)} style={[styles.option, formulario.situacao === item && styles.optionActive]}><Text style={[styles.optionText, formulario.situacao === item && styles.optionTextActive]}>{item}</Text></TouchableOpacity>)}</View>

              <TextInput style={styles.input} placeholder="Telefone" value={formulario.telefone} onChangeText={valor => alterarCampo('telefone', valor)} keyboardType="phone-pad" />
              <TextInput style={styles.input} placeholder="Horário de funcionamento" value={formulario.horario} onChangeText={valor => alterarCampo('horario', valor)} />
              <TextInput style={styles.input} placeholder="Capacidade aproximada" value={String(formulario.capacidade || '')} onChangeText={valor => alterarCampo('capacidade', valor)} keyboardType="numeric" />

              <View style={styles.switchRow}><Text style={styles.switchLabel}>♿ Possui acessibilidade</Text><Switch value={formulario.acessivel} onValueChange={valor => alterarCampo('acessivel', valor)} /></View>
              <View style={styles.switchRow}><Text style={styles.switchLabel}>🐾 Aceita animais</Text><Switch value={formulario.aceitaAnimais} onValueChange={valor => alterarCampo('aceitaAnimais', valor)} /></View>

              <Text style={styles.label}>Recursos disponíveis</Text>
              <View style={styles.options}>{RECURSOS.map(item => <TouchableOpacity key={item} onPress={() => alternarRecurso(item)} style={[styles.option, formulario.recursos.includes(item) && styles.optionActive]}><Text style={[styles.optionText, formulario.recursos.includes(item) && styles.optionTextActive]}>{item}</Text></TouchableOpacity>)}</View>

              {formulario.fotoUrl && <Image source={{ uri: formulario.fotoUrl }} style={styles.preview} />}
              <View style={styles.photoActions}><TouchableOpacity style={styles.photoButton} onPress={tirarFoto}><Text style={styles.photoText}>📷 Tirar foto</Text></TouchableOpacity><TouchableOpacity style={styles.photoButton} onPress={escolherFoto}><Text style={styles.photoText}>🖼️ Galeria</Text></TouchableOpacity></View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisivel(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={salvarAbrigo} disabled={salvando}><Text style={styles.saveText}>{salvando ? 'Salvando...' : 'Salvar'}</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
