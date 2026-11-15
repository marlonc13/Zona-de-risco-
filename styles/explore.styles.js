import { criarEstilos } from '../hooks/use-tema';

export default criarEstilos(c => ({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: c.surface },
  title: { fontSize: 24, fontWeight: '900', color: c.textStrong, marginBottom: 8 },
  text: { fontSize: 16, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
}));
