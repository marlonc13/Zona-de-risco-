// Os jest.mock abaixo são executados antes dos imports (o Jest os move para o topo)
import { StyleSheet } from 'react-native';
import { escalarEstilo } from '../components/texto';
import { ESCALA_LETRA_GRANDE } from '../contexts/FonteContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const plano = estilo => StyleSheet.flatten(estilo);
const ESCALA = ESCALA_LETRA_GRANDE;

describe('escalarEstilo ("Letras grandes")', () => {
  it('não mexe no estilo quando a opção está desligada', () => {
    const estilo = { fontSize: 16 };
    expect(escalarEstilo(estilo, 1, false)).toBe(estilo);
  });

  it('aumenta fontSize e lineHeight em 30%', () => {
    const resultado = plano(escalarEstilo({ fontSize: 20, lineHeight: 30, color: 'red' }, ESCALA, false));
    expect(resultado.fontSize).toBeCloseTo(26);
    expect(resultado.lineHeight).toBeCloseTo(39);
    expect(resultado.color).toBe('red');
  });

  it('parte do tamanho padrão (14) quando o texto não define fontSize', () => {
    expect(plano(escalarEstilo({ color: 'red' }, ESCALA, false)).fontSize).toBeCloseTo(18.2);
    expect(plano(escalarEstilo(undefined, ESCALA, false)).fontSize).toBeCloseTo(18.2);
  });

  it('em texto dentro de outro texto sem fontSize, herda do pai (não força 14)', () => {
    expect(plano(escalarEstilo({ fontWeight: 'bold' }, ESCALA, true)).fontSize).toBeUndefined();
  });

  it('em texto aninhado com fontSize próprio, aumenta normalmente', () => {
    expect(plano(escalarEstilo({ fontSize: 10 }, ESCALA, true)).fontSize).toBeCloseTo(13);
  });

  it('respeita estilos em lista: vale o último fontSize', () => {
    const resultado = plano(escalarEstilo([{ fontSize: 12 }, { fontSize: 20 }], ESCALA, false));
    expect(resultado.fontSize).toBeCloseTo(26);
  });
});

it('a escala de "Letras grandes" é de 30%', () => {
  expect(ESCALA_LETRA_GRANDE).toBe(1.3);
});
