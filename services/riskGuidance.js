export const GRAVIDADES = [
  { label: 'Atenção', cor: '#f9ab00', emoji: '🟡' },
  { label: 'Alerta', cor: '#e8710a', emoji: '🟠' },
  { label: 'Emergência', cor: '#d93025', emoji: '🔴' },
];

export const RAIOS_ALERTA = [
  { label: '500 m', valor: 500 },
  { label: '1 km', valor: 1000 },
  { label: '3 km', valor: 3000 },
  { label: '5 km', valor: 5000 },
];

const ORIENTACOES = {
  Alagamento: 'Evite ruas alagadas, não atravesse a água e procure um local elevado.',
  Enchente: 'Afaste-se de rios e córregos, desligue a energia e siga para um local seguro.',
  Deslizamento: 'Saia de perto de encostas, muros inclinados e locais com rachaduras no solo.',
  Vendaval: 'Fique longe de árvores, postes e janelas e procure abrigo em uma construção segura.',
  Seca: 'Economize água, mantenha-se hidratado e evite queimadas ou atividades com fogo.',
  'Incêndio florestal': 'Afaste-se da fumaça e do fogo, feche portas e janelas e acione os bombeiros.',
};

export function dadosGravidade(gravidade = 'Atenção') {
  return GRAVIDADES.find(item => item.label === gravidade) || GRAVIDADES[0];
}

export function orientacaoDoRisco(tipo) {
  return ORIENTACOES[tipo] || 'Mantenha distância da área afetada e siga as orientações das autoridades.';
}

export function formatarRaio(raioMetros = 1000) {
  return raioMetros >= 1000 ? `${raioMetros / 1000} km` : `${raioMetros} m`;
}
