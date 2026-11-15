import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Quanto as letras crescem quando "Letras grandes" está ligado (30%)
export const ESCALA_LETRA_GRANDE = 1.3;

const CHAVE_STORAGE = 'letraGrande';

const FonteContext = createContext({
  letraGrande: false,
  escala: 1,
  alternarLetraGrande: () => {},
});

export function FonteProvider({ children }) {
  const [letraGrande, setLetraGrande] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_STORAGE)
      .then(valor => setLetraGrande(valor === 'true'))
      .catch(() => {});
  }, []);

  const alternarLetraGrande = useCallback(async () => {
    const novoEstado = !letraGrande;
    setLetraGrande(novoEstado);
    await AsyncStorage.setItem(CHAVE_STORAGE, String(novoEstado));
  }, [letraGrande]);

  const valor = useMemo(() => ({
    letraGrande,
    escala: letraGrande ? ESCALA_LETRA_GRANDE : 1,
    alternarLetraGrande,
  }), [letraGrande, alternarLetraGrande]);

  return <FonteContext.Provider value={valor}>{children}</FonteContext.Provider>;
}

export const useFonte = () => useContext(FonteContext);
