import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { collection, getFirestore, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import app, { auth } from '../../services/firebaseConfig';
import { observarStatusAdministrador } from '../../services/accessControl';
import styles from '../../styles/relatorio.styles';
import { STATUS_ALERTA, dadosStatus, statusEfetivo } from '../../services/alertLifecycle';

const db = getFirestore(app);
const TIPOS = ['Alagamento', 'Enchente', 'Deslizamento', 'Vendaval', 'Seca', 'Incêndio florestal'];
const GRAVIDADES = ['Atenção', 'Alerta', 'Emergência'];

const escaparHtml = valor => String(valor ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function estaAtivo(item) {
  return ['ativo', 'monitoramento'].includes(statusEfetivo(item));
}

function contarPor(lista, campo, valores) {
  return valores.map(nome => ({ nome, total: lista.filter(item => (item[campo] || (campo === 'gravidade' ? 'Atenção' : 'Não informado')) === nome).length }));
}

export default function RelatorioScreen() {
  const router = useRouter();
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);

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

  useEffect(() => onSnapshot(collection(db, 'marcacoes'), snapshot => {
    setAlertas(snapshot.docs.map(documento => ({ id: documento.id, ...documento.data() })));
    setCarregando(false);
  }, erro => {
    console.error('Erro ao montar relatório:', erro);
    setCarregando(false);
  }), []);

  const dados = useMemo(() => {
    const ativos = alertas.filter(estaAtivo).length;
    const tipos = contarPor(alertas, 'tipo', TIPOS);
    const gravidades = contarPor(alertas, 'gravidade', GRAVIDADES);
    const estados = STATUS_ALERTA.map(estado => ({ ...estado, total: alertas.filter(item => statusEfetivo(item) === estado.id).length }));
    const bairrosAgrupados = alertas.reduce((total, item) => {
      const bairro = item.bairro?.trim() || 'Não informado';
      total[bairro] = (total[bairro] || 0) + 1;
      return total;
    }, {});
    const bairros = Object.entries(bairrosAgrupados)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
    return { total: alertas.length, ativos, encerrados: alertas.filter(item => statusEfetivo(item) === 'encerrado').length, tipos, gravidades, estados, bairros };
  }, [alertas]);

  const criarHtml = () => {
    const dataGeracao = new Date().toLocaleString('pt-BR');
    const linhasTipos = dados.tipos.map(item => `<tr><td>${escaparHtml(item.nome)}</td><td>${item.total}</td></tr>`).join('');
    const linhasGravidades = dados.gravidades.map(item => `<tr><td>${escaparHtml(item.nome)}</td><td>${item.total}</td></tr>`).join('');
    const linhasEstados = dados.estados.map(item => `<tr><td>${escaparHtml(item.label)}</td><td>${item.total}</td></tr>`).join('');
    const linhasBairros = dados.bairros.map(item => `<tr><td>${escaparHtml(item.nome)}</td><td>${item.total}</td></tr>`).join('');
    const linhasHistorico = [...alertas]
      .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0))
      .map(item => `<tr><td>${new Date(item.createdAtMillis || Date.now()).toLocaleDateString('pt-BR')}</td><td>${escaparHtml(item.tipo)}</td><td>${escaparHtml(item.bairro || 'Não informado')}</td><td>${escaparHtml(item.gravidade || 'Atenção')}</td><td>${escaparHtml(dadosStatus(statusEfetivo(item)).label)}</td></tr>`)
      .join('');

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>
      @page { margin: 28px; } body { font-family: Arial, sans-serif; color: #202124; font-size: 12px; }
      h1 { color: #1a73e8; margin-bottom: 3px; } h2 { margin-top: 22px; border-bottom: 2px solid #1a73e8; padding-bottom: 5px; }
      .sub { color: #5f6368; } .cards { display: flex; gap: 10px; margin: 18px 0; }
      .card { flex: 1; border: 1px solid #dadce0; border-radius: 8px; padding: 12px; }
      .numero { font-size: 24px; font-weight: bold; color: #1a73e8; } table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #e8f0fe; text-align: left; } th, td { border: 1px solid #dadce0; padding: 7px; }
      tr:nth-child(even) { background: #f8fafd; } .rodape { color: #80868b; margin-top: 22px; font-size: 10px; }
    </style></head><body>
      <h1>Zona de Risco</h1><div class="sub">Relatório administrativo de ocorrências naturais</div><div class="sub">Gerado em ${dataGeracao}</div>
      <div class="cards"><div class="card"><div class="numero">${dados.total}</div>Total de ocorrências</div><div class="card"><div class="numero">${dados.ativos}</div>Ativas</div><div class="card"><div class="numero">${dados.encerrados}</div>Encerradas ou expiradas</div></div>
      <h2>Ocorrências por tipo</h2><table><tr><th>Tipo de risco</th><th>Total</th></tr>${linhasTipos}</table>
      <h2>Ocorrências por gravidade</h2><table><tr><th>Gravidade</th><th>Total</th></tr>${linhasGravidades}</table>
      <h2>Ciclo de vida</h2><table><tr><th>Estado</th><th>Total</th></tr>${linhasEstados}</table>
      <h2>Ocorrências por bairro</h2><table><tr><th>Bairro</th><th>Total</th></tr>${linhasBairros || '<tr><td colspan="2">Nenhum bairro cadastrado</td></tr>'}</table>
      <h2>Histórico detalhado</h2><table><tr><th>Data</th><th>Tipo</th><th>Bairro</th><th>Gravidade</th><th>Status</th></tr>${linhasHistorico || '<tr><td colspan="5">Nenhuma ocorrência cadastrada</td></tr>'}</table>
      <div class="rodape">Documento gerado pelo aplicativo Zona de Risco. Dados baseados nos registros disponíveis no Firebase no momento da exportação.</div>
    </body></html>`;
  };

  const exportarPdf = async () => {
    try {
      setExportando(true);
      const { uri } = await Print.printToFileAsync({ html: criarHtml(), base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar relatório Zona de Risco', UTI: '.pdf' });
      } else {
        Alert.alert('PDF criado', `Arquivo salvo em: ${uri}`);
      }
    } catch (erro) {
      console.error('Erro ao exportar PDF:', erro);
      Alert.alert('Erro', 'Não foi possível gerar o relatório em PDF.');
    } finally {
      setExportando(false);
    }
  };

  if (carregando) return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  const maiorTipo = Math.max(1, ...dados.tipos.map(item => item.total));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.badge}>ADMINISTRADOR</Text>
      <Text style={styles.title}>Relatório de ocorrências</Text>
      <Text style={styles.subtitle}>Resumo de todo o histórico registrado no sistema</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}><Text style={styles.summaryNumber}>{dados.total}</Text><Text style={styles.summaryLabel}>Total</Text></View>
        <View style={styles.summaryCard}><Text style={[styles.summaryNumber, { color: '#137333' }]}>{dados.ativos}</Text><Text style={styles.summaryLabel}>Ativos</Text></View>
        <View style={styles.summaryCard}><Text style={[styles.summaryNumber, { color: '#5f6368' }]}>{dados.encerrados}</Text><Text style={styles.summaryLabel}>Encerrados</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ocorrências por tipo</Text>
        {dados.tipos.map(item => <View key={item.nome} style={styles.metric}><View style={styles.metricHeader}><Text style={styles.metricName}>{item.nome}</Text><Text style={styles.metricTotal}>{item.total}</Text></View><View style={styles.barTrack}><View style={[styles.barFill, { width: `${(item.total / maiorTipo) * 100}%` }]} /></View></View>)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Por gravidade</Text>
        {dados.gravidades.map(item => <View key={item.nome} style={styles.rowItem}><Text style={styles.rowName}>{item.nome}</Text><Text style={styles.rowTotal}>{item.total}</Text></View>)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ciclo de vida dos alertas</Text>
        {dados.estados.map(item => <View key={item.id} style={styles.rowItem}><Text style={[styles.rowName, { color: item.cor }]}>{item.emoji} {item.label}</Text><Text style={styles.rowTotal}>{item.total}</Text></View>)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bairros com mais ocorrências</Text>
        {dados.bairros.length ? dados.bairros.slice(0, 10).map((item, indice) => <View key={item.nome} style={styles.rowItem}><Text style={styles.rowName}>{indice + 1}. {item.nome}</Text><Text style={styles.rowTotal}>{item.total}</Text></View>) : <Text style={styles.empty}>Nenhum bairro cadastrado.</Text>}
      </View>

      <TouchableOpacity style={styles.pdfButton} onPress={exportarPdf} disabled={exportando}>
        <Text style={styles.pdfButtonText}>{exportando ? 'Gerando PDF...' : '📄 Exportar relatório em PDF'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
