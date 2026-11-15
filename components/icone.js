import { FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useFonte } from '../contexts/FonteContext';

// Ícones usados nas telas no lugar dos emojis. Cada nome aponta para [família, ícone].
// Podem ficar soltos ou dentro de um <Text> (ex.: <Text><Icone nome="casa" /> Início</Text>);
// dentro do texto, sem `color`, o ícone herda a cor do texto.
const ICONES = {
  acessivel: [FontAwesome6, 'wheelchair'],
  alerta: [Ionicons, 'warning'],
  ambulancia: [MaterialCommunityIcons, 'ambulance'],
  animais: [FontAwesome6, 'paw'],
  bombeiros: [MaterialCommunityIcons, 'fire-truck'],
  cadeado: [Ionicons, 'lock-closed'],
  camera: [Ionicons, 'camera'],
  casa: [Ionicons, 'home'],
  celular: [Ionicons, 'phone-portrait'],
  check: [Ionicons, 'checkmark'],
  checkbox: [MaterialCommunityIcons, 'checkbox-blank-outline'],
  clima: [Ionicons, 'partly-sunny'],
  compartilhar: [Ionicons, 'share-social'],
  emergencia: [MaterialCommunityIcons, 'alarm-light'],
  engrenagem: [Ionicons, 'settings-sharp'],
  escudo: [MaterialCommunityIcons, 'shield-check'],
  estrela: [Ionicons, 'star'],
  fechar: [Ionicons, 'close'],
  galeria: [Ionicons, 'images'],
  localizacao: [Ionicons, 'location-sharp'],
  olho: [Ionicons, 'eye'],
  olhoFechado: [Ionicons, 'eye-off'],
  pdf: [FontAwesome6, 'file-pdf'],
  pesquisar: [Ionicons, 'search'],
  pessoas: [Ionicons, 'people'],
  policia: [MaterialCommunityIcons, 'police-badge'],
  raio: [Ionicons, 'flash'],
  relogio: [Ionicons, 'time'],
  rota: [Ionicons, 'navigate'],
  telefone: [Ionicons, 'call'],
  verificado: [MaterialCommunityIcons, 'check-decagram'],
  voltar: [Ionicons, 'chevron-back'],
  whatsapp: [FontAwesome6, 'whatsapp'],
};

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

const normalizarTipo = tipo => String(tipo || '')
  .trim()
  .toLocaleLowerCase('pt-BR')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

// Acompanha "Letras grandes", como o Text. Use escalavel={false} em ícones de tamanho fixo
// (dentro de círculos ou botões redondos).
function useTamanho(size, escalavel) {
  const { escala } = useFonte();
  return escalavel ? size * escala : size;
}

export default function Icone({ nome, size = 16, color, escalavel = true, style }) {
  const tamanho = useTamanho(size, escalavel);
  const [Familia, nomeIcone] = ICONES[nome] || ICONES.alerta;
  return <Familia name={nomeIcone} size={tamanho} color={color} style={style} />;
}

export function IconeTipo({ tipo, size = 18, color, escalavel = true, style }) {
  const tamanho = useTamanho(size, escalavel);
  return <MaterialCommunityIcons name={ICONES_TIPO[normalizarTipo(tipo)] || 'alert-circle-outline'} size={tamanho} color={color} style={style} />;
}

export function IconeStatus({ id, size = 14, color, escalavel = true, style }) {
  const tamanho = useTamanho(size, escalavel);
  return <MaterialCommunityIcons name={ICONES_STATUS[id] || 'circle-outline'} size={tamanho} color={color} style={style} />;
}

export function IconeGravidade({ label, size = 14, color, escalavel = true, style }) {
  const tamanho = useTamanho(size, escalavel);
  return <MaterialCommunityIcons name={ICONES_GRAVIDADE[label] || 'alert-outline'} size={tamanho} color={color} style={style} />;
}
