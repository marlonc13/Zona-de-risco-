import { criarEstilos } from '../hooks/use-tema';

export default criarEstilos((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.surface, // Fundo da tela enquanto carrega
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
  },
}));
