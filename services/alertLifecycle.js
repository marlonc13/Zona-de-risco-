export const STATUS_ALERTA = [
  { id: 'rascunho', label: 'Rascunho', cor: '#5f6368', fundo: '#f1f3f4' },
  { id: 'ativo', label: 'Ativa', cor: '#b3261e', fundo: '#fce8e6' },
  { id: 'monitoramento', label: 'Em monitoramento', cor: '#0b57d0', fundo: '#e8f0fe' },
  { id: 'controlado', label: 'Controlada', cor: '#8a3b00', fundo: '#fff4e5' },
  { id: 'encerrado', label: 'Encerrada', cor: '#137333', fundo: '#e6f4ea' },
];

export function dadosStatus(status) {
  return STATUS_ALERTA.find(item => item.id === status) || STATUS_ALERTA[1];
}

export function statusEfetivo(ocorrencia) {
  const status = ocorrencia?.status || 'ativo';
  if (status === 'encerrado') return 'encerrado';
  if (['rascunho', 'controlado'].includes(status)) return status;
  if (ocorrencia?.expiresAt && ocorrencia.expiresAt <= Date.now()) return 'encerrado';
  if (status === 'monitoramento') return 'monitoramento';
  return 'ativo';
}

export function apareceNoMapa(ocorrencia) {
  const status = statusEfetivo(ocorrencia);
  return ['ativo', 'monitoramento'].includes(status)
    && ocorrencia?.expiresAt
    && ocorrencia.expiresAt > Date.now();
}

export function proximoStatus(status) {
  const ordem = STATUS_ALERTA.map(item => item.id);
  const indice = ordem.indexOf(status || 'ativo');
  return indice >= 0 && indice < ordem.length - 1 ? ordem[indice + 1] : null;
}

const UM_DIA = 24 * 60 * 60 * 1000;

// Períodos do mapa de calor. "Tudo" não tem limite: mostra todo o histórico.
export const PERIODOS_MAPA_CALOR = [
  { id: 'tudo', label: 'Tudo', duracao: null },
  { id: 'mes', label: 'Último mês', duracao: 30 * UM_DIA },
  { id: 'semana', label: 'Última semana', duracao: 7 * UM_DIA },
  { id: '24h', label: 'Últimas 24 horas', duracao: UM_DIA },
];

export const PERIODO_PADRAO_MAPA_CALOR = 'mes';

export function periodoValido(periodoId) {
  return PERIODOS_MAPA_CALOR.some(item => item.id === periodoId);
}

// Momento em que a ocorrência foi registrada, em milissegundos.
// Registros antigos podem ter só o Timestamp do Firestore em createdAt.
export function momentoDaOcorrencia(ocorrencia) {
  if (typeof ocorrencia?.createdAtMillis === 'number') return ocorrencia.createdAtMillis;
  const criado = ocorrencia?.createdAt;
  if (criado instanceof Date) return criado.getTime();
  if (criado && typeof criado.toMillis === 'function') return criado.toMillis();
  return null;
}

// Ocorrência sem data só entra no período "Tudo": não dá para saber se é recente.
export function dentroDoPeriodo(ocorrencia, periodoId) {
  const periodo = PERIODOS_MAPA_CALOR.find(item => item.id === periodoId);
  if (!periodo || periodo.duracao === null) return true;
  const momento = momentoDaOcorrencia(ocorrencia);
  if (momento === null) return false;
  return Date.now() - momento <= periodo.duracao;
}
