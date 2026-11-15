// Testa firestore.rules no emulador: é aqui que o acesso é garantido de verdade
// (a checagem de administrador dentro do app só esconde botões).
const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection } = require('firebase/firestore');

const ADMIN_PRINCIPAL = 'alinelasneau@gmail.com';
const ADMIN = 'admin@exemplo.com';
const ADMIN_INATIVO = 'inativo@exemplo.com';
const USUARIO = 'usuario@exemplo.com';

let ambiente;

// Banco "como usuário": cada perfil recebe o próprio uid e e-mail no token
const bancoDe = (uid, email) => ambiente.authenticatedContext(uid, { email }).firestore();
const visitante = () => ambiente.unauthenticatedContext().firestore();
const usuario = () => bancoDe('uid-usuario', USUARIO);
const outroUsuario = () => bancoDe('uid-outro', 'outro@exemplo.com');
const admin = () => bancoDe('uid-admin', ADMIN);
const adminInativo = () => bancoDe('uid-inativo', ADMIN_INATIVO);
const adminPrincipal = () => bancoDe('uid-principal', ADMIN_PRINCIPAL);

const ALERTA = { tipo: 'Alagamento', gravidade: 'Alerta', comentario: 'Rua alagada', status: 'ativo' };
const ABRIGO = { nome: 'Escola Municipal', situacao: 'Aberto' };

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'demo-zona-de-risco',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await ambiente.cleanup();
});

// Cada teste começa com o mesmo banco: um alerta, um abrigo, os cadastros de
// administradores e o perfil do usuário comum
beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async contexto => {
    const db = contexto.firestore();
    await setDoc(doc(db, 'marcacoes/alerta-1'), ALERTA);
    await setDoc(doc(db, 'abrigos/abrigo-1'), ABRIGO);
    await setDoc(doc(db, `administradores/${ADMIN}`), { email: ADMIN, ativo: true });
    await setDoc(doc(db, `administradores/${ADMIN_INATIVO}`), { email: ADMIN_INATIVO, ativo: false });
    await setDoc(doc(db, 'usuarios/uid-usuario'), { nome: 'Usuário', email: USUARIO });
  });
});

describe('visitante (sem login)', () => {
  it('consulta alertas e abrigos', async () => {
    await assertSucceeds(getDoc(doc(visitante(), 'marcacoes/alerta-1')));
    await assertSucceeds(getDocs(collection(visitante(), 'abrigos')));
  });

  it('não cria, altera nem exclui alertas e abrigos', async () => {
    await assertFails(setDoc(doc(visitante(), 'marcacoes/novo'), ALERTA));
    await assertFails(updateDoc(doc(visitante(), 'marcacoes/alerta-1'), { status: 'encerrado' }));
    await assertFails(deleteDoc(doc(visitante(), 'abrigos/abrigo-1')));
  });

  it('não lê perfis de usuários nem a lista de administradores', async () => {
    await assertFails(getDoc(doc(visitante(), 'usuarios/uid-usuario')));
    await assertFails(getDoc(doc(visitante(), `administradores/${ADMIN}`)));
  });
});

describe('usuário comum', () => {
  it('não publica, edita nem exclui alertas', async () => {
    await assertFails(setDoc(doc(usuario(), 'marcacoes/novo'), ALERTA));
    await assertFails(updateDoc(doc(usuario(), 'marcacoes/alerta-1'), { gravidade: 'Emergência' }));
    await assertFails(deleteDoc(doc(usuario(), 'marcacoes/alerta-1')));
  });

  it('não cadastra nem altera abrigos', async () => {
    await assertFails(setDoc(doc(usuario(), 'abrigos/novo'), ABRIGO));
    await assertFails(updateDoc(doc(usuario(), 'abrigos/abrigo-1'), { situacao: 'Fechado' }));
  });

  it('lê, edita e exclui o próprio perfil', async () => {
    await assertSucceeds(getDoc(doc(usuario(), 'usuarios/uid-usuario')));
    await assertSucceeds(updateDoc(doc(usuario(), 'usuarios/uid-usuario'), { nome: 'Novo nome' }));
    await assertSucceeds(deleteDoc(doc(usuario(), 'usuarios/uid-usuario')));
  });

  it('não lê nem altera o perfil de outra pessoa', async () => {
    await assertFails(getDoc(doc(outroUsuario(), 'usuarios/uid-usuario')));
    await assertFails(updateDoc(doc(outroUsuario(), 'usuarios/uid-usuario'), { nome: 'Invasor' }));
  });

  it('consulta só o próprio status de administrador', async () => {
    await assertSucceeds(getDoc(doc(usuario(), `administradores/${USUARIO}`)));
    await assertFails(getDoc(doc(usuario(), `administradores/${ADMIN}`)));
    await assertFails(getDocs(collection(usuario(), 'administradores')));
  });

  it('não consegue se cadastrar como administrador', async () => {
    await assertFails(setDoc(doc(usuario(), `administradores/${USUARIO}`), { email: USUARIO, ativo: true }));
  });
});

describe('administrador cadastrado e ativo', () => {
  it('publica, edita e exclui alertas', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'marcacoes/novo'), ALERTA));
    await assertSucceeds(updateDoc(doc(admin(), 'marcacoes/alerta-1'), { status: 'encerrado' }));
    await assertSucceeds(deleteDoc(doc(admin(), 'marcacoes/alerta-1')));
  });

  it('gerencia abrigos', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'abrigos/novo'), ABRIGO));
    await assertSucceeds(updateDoc(doc(admin(), 'abrigos/abrigo-1'), { situacao: 'Lotado' }));
    await assertSucceeds(deleteDoc(doc(admin(), 'abrigos/abrigo-1')));
  });

  it('não cadastra, remove nem lista outros administradores', async () => {
    await assertFails(setDoc(doc(admin(), `administradores/${USUARIO}`), { email: USUARIO, ativo: true }));
    await assertFails(deleteDoc(doc(admin(), `administradores/${ADMIN_INATIVO}`)));
    await assertFails(getDocs(collection(admin(), 'administradores')));
  });

  it('não reativa o próprio cadastro nem o de outro administrador', async () => {
    await assertFails(updateDoc(doc(admin(), `administradores/${ADMIN_INATIVO}`), { ativo: true }));
  });
});

describe('administrador desativado (ativo: false)', () => {
  it('perde o acesso para publicar e gerenciar', async () => {
    await assertFails(setDoc(doc(adminInativo(), 'marcacoes/novo'), ALERTA));
    await assertFails(setDoc(doc(adminInativo(), 'abrigos/novo'), ABRIGO));
  });

  it('não consegue se reativar', async () => {
    await assertFails(updateDoc(doc(adminInativo(), `administradores/${ADMIN_INATIVO}`), { ativo: true }));
  });
});

describe('administradora principal', () => {
  it('publica alertas sem precisar de cadastro em administradores', async () => {
    await assertSucceeds(setDoc(doc(adminPrincipal(), 'marcacoes/novo'), ALERTA));
  });

  it('lista, cadastra e remove administradores', async () => {
    await assertSucceeds(getDocs(collection(adminPrincipal(), 'administradores')));
    await assertSucceeds(setDoc(doc(adminPrincipal(), `administradores/${USUARIO}`), { email: USUARIO, ativo: true }));
    await assertSucceeds(deleteDoc(doc(adminPrincipal(), `administradores/${ADMIN_INATIVO}`)));
  });

  it('não lê o perfil pessoal de outros usuários', async () => {
    await assertFails(getDoc(doc(adminPrincipal(), 'usuarios/uid-usuario')));
  });
});
