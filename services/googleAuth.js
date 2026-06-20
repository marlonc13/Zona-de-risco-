import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { getAuth, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import app from "./firebaseConfig";

WebBrowser.maybeCompleteAuthSession();

const auth = getAuth(app);

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "SEU_EXPO_CLIENT_ID",
    androidClientId: "SEU_ANDROID_CLIENT_ID",
    iosClientId: "SEU_IOS_CLIENT_ID",
  });

  async function handleSignIn() {
    if (response?.type === "success") {
      const { id_token } = response.params;

      const credential = GoogleAuthProvider.credential(id_token);

      const userCredential = await signInWithCredential(auth, credential);

      console.log("Usuário logado:", userCredential.user);
    }
  }

  return { request, promptAsync, handleSignIn, response };
}