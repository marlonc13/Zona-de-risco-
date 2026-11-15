// Ícones carregam fontes nativas, que não existem nos testes; aqui viram componentes vazios
jest.mock('@expo/vector-icons', () => {
  const Icone = () => null;
  return new Proxy({}, { get: (_alvo, nome) => (nome === '__esModule' ? true : Icone) });
});
