export const STATUS_ALERTA = [
  { id: 'rascunho', label: 'Rascunho', emoji: '📝', cor: '#5f6368', fundo: '#f1f3f4' },
  { id: 'ativo', label: 'Ativa', emoji: '🔴', cor: '#b3261e', fundo: '#fce8e6' },
  { id: 'monitoramento', label: 'Em monitoramento', emoji: '👁️', cor: '#0b57d0', fundo: '#e8f0fe' },
  { id: 'controlado', label: 'Controlada', emoji: '🛡️', cor: '#8a3b00', fundo: '#fff4e5' },
  { id: 'encerrado', label: 'Encerrada', emoji: '✅', cor: '#137333', fundo: '#e6f4ea' },
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
