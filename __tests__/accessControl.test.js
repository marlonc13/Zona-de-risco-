// O Firebase real não é usado: o Firestore é simulado para controlar as respostas
jest.mock('../services/firebaseConfig', () => ({ __esModule: true, default: {} }));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((_db, colecao, id) => ({ caminho: `${colecao}/${id}` })),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
}));

const firestore = require('firebase/firestore');

// O módulo guarda em memória quem já foi confirmado como administrador,
// então cada teste carrega uma cópia nova para não herdar estado do anterior
function carregarModulo() {
  let modulo;
  jest.isolateModules(() => {
    modulo = require('../services/accessControl');
  });
  return modulo;
}

const documento = dados => ({
  exists: () => dados !== null,
  data: () => dados,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  console.warn.mockRestore();
});

describe('normalizarEmail', () => {
  it('remove espaços e ignora maiúsculas', () => {
    const { normalizarEmail } = carregarModulo();
    expect(normalizarEmail('  Fulano@Exemplo.COM ')).toBe('fulano@exemplo.com');
  });

  it('devolve texto vazio sem e-mail', () => {
    const { normalizarEmail } = carregarModulo();
    expect(normalizarEmail(undefined)).toBe('');
    expect(normalizarEmail(null)).toBe('');
  });
});

describe('isMainAdmin / isAdminUser', () => {
  it('reconhece o administrador principal sem diferenciar maiúsculas', () => {
    const { isMainAdmin, isAdminUser, ADMIN_PRINCIPAL } = carregarModulo();
    expect(isMainAdmin({ email: ADMIN_PRINCIPAL.toUpperCase() })).toBe(true);
    expect(isAdminUser({ email: ADMIN_PRINCIPAL })).toBe(true);
  });

  it('não considera administrador quem não foi confirmado', () => {
    const { isMainAdmin, isAdminUser } = carregarModulo();
    expect(isMainAdmin({ email: 'fulano@exemplo.com' })).toBe(false);
    expect(isAdminUser({ email: 'fulano@exemplo.com' })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
  });
});

describe('verificarAdministrador', () => {
  it('nega acesso sem e-mail e nem consulta o Firestore', async () => {
    const { verificarAdministrador } = carregarModulo();
    await expect(verificarAdministrador({})).resolves.toBe(false);
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it('aceita o administrador principal sem consultar o Firestore', async () => {
    const { verificarAdministrador, ADMIN_PRINCIPAL } = carregarModulo();
    await expect(verificarAdministrador({ email: ADMIN_PRINCIPAL })).resolves.toBe(true);
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it('aceita quem está cadastrado e ativo, e passa a reconhecê-lo como admin', async () => {
    const { verificarAdministrador, isAdminUser } = carregarModulo();
    firestore.getDoc.mockResolvedValue(documento({ ativo: true }));

    await expect(verificarAdministrador({ email: ' Admin@Exemplo.com ' })).resolves.toBe(true);
    expect(firestore.doc).toHaveBeenCalledWith(expect.anything(), 'administradores', 'admin@exemplo.com');
    expect(isAdminUser({ email: 'admin@exemplo.com' })).toBe(true);
  });

  it('nega quem está cadastrado como inativo', async () => {
    const { verificarAdministrador } = carregarModulo();
    firestore.getDoc.mockResolvedValue(documento({ ativo: false }));
    await expect(verificarAdministrador({ email: 'admin@exemplo.com' })).resolves.toBe(false);
  });

  it('nega quem não está cadastrado', async () => {
    const { verificarAdministrador } = carregarModulo();
    firestore.getDoc.mockResolvedValue(documento(null));
    await expect(verificarAdministrador({ email: 'fulano@exemplo.com' })).resolves.toBe(false);
  });

  it('falha fechado: se o Firestore der erro, a conta vira usuário comum', async () => {
    const { verificarAdministrador, isAdminUser } = carregarModulo();

    // primeiro é confirmado como admin...
    firestore.getDoc.mockResolvedValueOnce(documento({ ativo: true }));
    await verificarAdministrador({ email: 'admin@exemplo.com' });
    expect(isAdminUser({ email: 'admin@exemplo.com' })).toBe(true);

    // ...depois a consulta falha e o acesso é retirado
    firestore.getDoc.mockRejectedValueOnce({ code: 'permission-denied' });
    await expect(verificarAdministrador({ email: 'admin@exemplo.com' })).resolves.toBe(false);
    expect(isAdminUser({ email: 'admin@exemplo.com' })).toBe(false);
  });
});

describe('observarStatusAdministrador', () => {
  it('avisa "não é admin" na hora quando não há usuário', () => {
    const { observarStatusAdministrador } = carregarModulo();
    const callback = jest.fn();
    const parar = observarStatusAdministrador(null, callback);
    expect(callback).toHaveBeenCalledWith(false);
    expect(typeof parar).toBe('function');
    expect(firestore.onSnapshot).not.toHaveBeenCalled();
  });

  it('avisa "é admin" na hora para o administrador principal', () => {
    const { observarStatusAdministrador, ADMIN_PRINCIPAL } = carregarModulo();
    const callback = jest.fn();
    observarStatusAdministrador({ email: ADMIN_PRINCIPAL }, callback);
    expect(callback).toHaveBeenCalledWith(true);
  });

  it('acompanha as mudanças do cadastro e nega em caso de erro', () => {
    const { observarStatusAdministrador } = carregarModulo();
    const callback = jest.fn();
    const pararInscricao = jest.fn();
    firestore.onSnapshot.mockReturnValue(pararInscricao);

    const parar = observarStatusAdministrador({ email: 'admin@exemplo.com' }, callback);
    const [, aoMudar, aoFalhar] = firestore.onSnapshot.mock.calls[0];

    aoMudar(documento({ ativo: true }));
    aoMudar(documento({ ativo: false }));
    aoFalhar(new Error('sem rede'));

    expect(callback.mock.calls).toEqual([[true], [false], [false]]);
    expect(parar).toBe(pararInscricao);
  });
});
