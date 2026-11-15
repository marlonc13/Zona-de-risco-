import { StyleSheet } from 'react-native';

import { Colors } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

// Tema ativo do app (escolhido em Configurações): 'light' ou 'dark'
export function useTema() {
  const { activeTheme } = useTheme() || {};
  const tema = activeTheme === 'dark' ? 'dark' : 'light';
  return { tema, escuro: tema === 'dark', cores: Colors[tema] };
}

// Monta os estilos dos dois temas uma única vez, no carregamento do arquivo.
// Uso no arquivo de estilos:
//   export default criarEstilos((c, tema) => ({ titulo: { color: c.textStrong } }));
export function criarEstilos(fabrica) {
  return {
    light: StyleSheet.create(fabrica(Colors.light, 'light')),
    dark: StyleSheet.create(fabrica(Colors.dark, 'dark')),
  };
}

// Devolve os estilos do tema ativo. Uso na tela:
//   const styles = useEstilos(estilosDaTela);
export function useEstilos(estilos) {
  const { tema } = useTema();
  return estilos[tema];
}
