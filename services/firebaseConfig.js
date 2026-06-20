import { initializeApp, getApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCUBxoQP9OT4hPMH6FoqaWLSX3rkipHOzY",
  authDomain: "zona-de-risco-af5c7.firebaseapp.com",
  projectId: "zona-de-risco-af5c7",
  storageBucket: "zona-de-risco-af5c7.firebasestorage.app",
  messagingSenderId: "1046060560404",
  appId: "1:1046060560404:web:99e5b1a431cb0ba7c73701"
};
// Inicializa o Firebase apenas uma vez
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth para React Native
let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

// Storage
const storage = getStorage(app);

export { auth, storage };
export default app;