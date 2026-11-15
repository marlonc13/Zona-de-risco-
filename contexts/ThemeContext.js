import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// themeMode: escolha do usuário ('light' | 'dark' | 'system')
// activeTheme: tema aplicado de fato ('light' | 'dark')
export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem('tema')
      .then(savedTheme => { if (savedTheme) setThemeMode(savedTheme); })
      .catch(() => {});
  }, []);

  const toggleTheme = async (newTheme) => {
    setThemeMode(newTheme);
    await AsyncStorage.setItem('tema', newTheme);
  };

  const activeTheme = themeMode === 'system' ? (deviceTheme || 'light') : themeMode;

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
