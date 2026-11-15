import { initializeApp, getApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyANbtmjcMMp2bXn37JHX_MTkLJxWe0cLIg",
  authDomain: "zona-de-risco.firebaseapp.com",
  projectId: "zona-de-risco",
  storageBucket: "zona-de-risco.firebasestorage.app",
  messagingSenderId: "381656913472",
  appId: "1:381656913472:web:42a11f12a9432d1c9231a5",
};
// Inicializa o Firebase apenas uma vez
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // já inicializado (ex.: recarregamento rápido do app)
  auth = getAuth(app);
}

export { auth };
export default app;
