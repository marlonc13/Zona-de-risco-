import { apareceNoMapa, dadosStatus, proximoStatus, statusEfetivo } from '../services/alertLifecycle';

// Data fixa para que "expirado" e "no futuro" não dependam do relógio da máquina
const AGORA = new Date('2026-01-10T12:00:00Z').getTime();
const UMA_HORA = 60 * 60 * 1000;
const noFuturo = AGORA + UMA_HORA;
const noPassado = AGORA - UMA_HORA;

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(AGORA);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('statusEfetivo', () => {
  it('trata ocorrência sem status como ativa (registros antigos)', () => {
    expect(statusEfetivo({ expiresAt: noFuturo })).toBe('ativo');
    expect(statusEfetivo(undefined)).toBe('ativo');
  });

  it('encerra automaticamente um alerta ativo que já expirou', () => {
    expect(statusEfetivo({ status: 'ativo', expiresAt: noPassado })).toBe('encerrado');
  });

  it('encerra automaticamente um alerta em monitoramento que já expirou', () => {
    expect(statusEfetivo({ status: 'monitoramento', expiresAt: noPassado })).toBe('encerrado');
    expect(statusEfetivo({ status: 'monitoramento', expiresAt: noFuturo })).toBe('monitoramento');
  });

  it('mantém rascunho e controlado mesmo depois da expiração', () => {
    expect(statusEfetivo({ status: 'rascunho', expiresAt: noPassado })).toBe('rascunho');
    expect(statusEfetivo({ status: 'controlado', expiresAt: noPassado })).toBe('controlado');
  });

  it('considera expirado exatamente no instante da expiração', () => {
    expect(statusEfetivo({ status: 'ativo', expiresAt: AGORA })).toBe('encerrado');
  });

  it('trata status desconhecido como ativo', () => {
    expect(statusEfetivo({ status: 'qualquer-coisa', expiresAt: noFuturo })).toBe('ativo');
  });
});

describe('apareceNoMapa', () => {
  it('mostra alertas ativos e em monitoramento que ainda não expiraram', () => {
    expect(apareceNoMapa({ status: 'ativo', expiresAt: noFuturo })).toBe(true);
    expect(apareceNoMapa({ status: 'monitoramento', expiresAt: noFuturo })).toBe(true);
  });

  it('esconde alertas expirados', () => {
    expect(apareceNoMapa({ status: 'ativo', expiresAt: noPassado })).toBeFalsy();
  });

  it('esconde alertas sem data de expiração (ex.: rascunho nunca publicado)', () => {
    expect(apareceNoMapa({ status: 'ativo', expiresAt: null })).toBeFalsy();
  });

  it('esconde rascunhos, controlados e encerrados mesmo dentro do prazo', () => {
    expect(apareceNoMapa({ status: 'rascunho', expiresAt: noFuturo })).toBeFalsy();
    expect(apareceNoMapa({ status: 'controlado', expiresAt: noFuturo })).toBeFalsy();
    expect(apareceNoMapa({ status: 'encerrado', expiresAt: noFuturo })).toBeFalsy();
  });
});

describe('proximoStatus', () => {
  it('segue a ordem do ciclo de vida', () => {
    expect(proximoStatus('rascunho')).toBe('ativo');
    expect(proximoStatus('ativo')).toBe('monitoramento');
    expect(proximoStatus('monitoramento')).toBe('controlado');
    expect(proximoStatus('controlado')).toBe('encerrado');
  });

  it('não avança depois de encerrado', () => {
    expect(proximoStatus('encerrado')).toBeNull();
  });

  it('trata status vazio como ativo e status inválido como sem próximo', () => {
    expect(proximoStatus(undefined)).toBe('monitoramento');
    expect(proximoStatus('invalido')).toBeNull();
  });
});

describe('dadosStatus', () => {
  it('devolve os dados do status pedido', () => {
    expect(dadosStatus('encerrado').label).toBe('Encerrada');
  });

  it('usa "ativo" quando o status não existe', () => {
    expect(dadosStatus('invalido').id).toBe('ativo');
  });
});
