import { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

import { useFonte } from '../contexts/FonteContext';

// Tamanho que o React Native usa quando o estilo não define fontSize
const TAMANHO_PADRAO = 14;

// Indica que o texto está dentro de outro <Text> e deve herdar o tamanho do pai
const DentroDeTexto = createContext(false);

// Aplica a escala de "Letras grandes" no fontSize e no lineHeight do estilo
function escalarEstilo(style, escala, herdaTamanho) {
  if (escala === 1) return style;

  const plano = StyleSheet.flatten(style) || {};
  const ajuste = {};

  if (typeof plano.fontSize === 'number') ajuste.fontSize = plano.fontSize * escala;
  else if (!herdaTamanho) ajuste.fontSize = TAMANHO_PADRAO * escala;

  if (typeof plano.lineHeight === 'number') ajuste.lineHeight = plano.lineHeight * escala;

  return [style, ajuste];
}

// Substitui o Text do react-native. Use escalavel={false} em ícones/símbolos
// que ficam dentro de um círculo ou botão de tamanho fixo.
export const Text = forwardRef(function Text({ style, escalavel = true, ...props }, ref) {
  const { escala } = useFonte();
  const aninhado = useContext(DentroDeTexto);

  return (
    <DentroDeTexto.Provider value>
      <RNText ref={ref} style={escalarEstilo(style, escalavel ? escala : 1, aninhado)} {...props} />
    </DentroDeTexto.Provider>
  );
});

// Substitui o TextInput do react-native
export const TextInput = forwardRef(function TextInput({ style, escalavel = true, ...props }, ref) {
  const { escala } = useFonte();

  return <RNTextInput ref={ref} style={escalarEstilo(style, escalavel ? escala : 1, false)} {...props} />;
});
