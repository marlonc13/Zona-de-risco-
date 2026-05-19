import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Como você está em app/(tabs)/context, precisa subir 3 níveis para chegar na raiz 
// e depois entrar em constants:
import { Colors } from '../../../constants/theme'; 

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme(); 
  const [themeMode, setThemeMode] = useState('system'); 

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('tema');
      if (savedTheme) setThemeMode(savedTheme);
    };
    loadTheme();
  }, []);

  const toggleTheme = async (newTheme) => {
    setThemeMode(newTheme);
    await AsyncStorage.setItem('tema', newTheme);
  };

  const activeTheme = themeMode === 'system' ? (deviceTheme || 'light') : themeMode;
  const themeData = Colors[activeTheme];

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, themeData, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);