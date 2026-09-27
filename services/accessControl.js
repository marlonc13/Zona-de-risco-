import { doc, getDoc, getFirestore, onSnapshot } from 'firebase/firestore';
import app from './firebaseConfig';

export const ADMIN_PRINCIPAL = 'alinelasneau@gmail.com';
const adminsConfirmados = new Set([ADMIN_PRINCIPAL]);
const db = getFirestore(app);

export const normalizarEmail = email => email?.trim().toLowerCase() || '';

export function isMainAdmin(user) {
  return normalizarEmail(user?.email) === ADMIN_PRINCIPAL;
}

export function isAdminUser(user) {
  const email = normalizarEmail(user?.email);
  return Boolean(email && adminsConfirmados.has(email));
}

export async function verificarAdministrador(user) {
  const email = normalizarEmail(user?.email);
  if (!email) return false;
  if (email === ADMIN_PRINCIPAL) return true;
  const snapshot = await getDoc(doc(db, 'administradores', email));
  const autorizado = snapshot.exists() && snapshot.data()?.ativo !== false;
  if (autorizado) adminsConfirmados.add(email);
  else adminsConfirmados.delete(email);
  return autorizado;
}

export function observarStatusAdministrador(user, callback) {
  const email = normalizarEmail(user?.email);
  if (!email) {
    callback(false);
    return () => {};
  }
  if (email === ADMIN_PRINCIPAL) {
    callback(true);
    return () => {};
  }
  return onSnapshot(doc(db, 'administradores', email), snapshot => {
    const autorizado = snapshot.exists() && snapshot.data()?.ativo !== false;
    if (autorizado) adminsConfirmados.add(email);
    else adminsConfirmados.delete(email);
    callback(autorizado);
  }, () => callback(false));
}
