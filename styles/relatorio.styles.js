import { criarEstilos } from '../hooks/use-tema';

export default criarEstilos(c => ({
  container: { flex: 1, backgroundColor: c.screen },
  content: { paddingTop: 54, paddingHorizontal: 16, paddingBottom: 120 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  badge: { alignSelf: 'flex-start', color: c.onButton, backgroundColor: c.button, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, fontSize: 10, fontWeight: '900' },
  title: { color: c.textStrong, fontSize: 25, fontWeight: '900', marginTop: 10 },
  subtitle: { color: c.textMuted, marginTop: 3, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, backgroundColor: c.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.borderSoft },
  summaryNumber: { color: c.tint, fontSize: 25, fontWeight: '900' },
  summaryLabel: { color: c.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  section: { backgroundColor: c.surface, borderRadius: 16, padding: 15, marginTop: 13, borderWidth: 1, borderColor: c.borderSoft },
  sectionTitle: { color: c.textStrong, fontSize: 16, fontWeight: '900', marginBottom: 10 },
  metric: { marginBottom: 11 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  metricName: { flex: 1, marginRight: 8, color: c.textSecondary, fontSize: 12, fontWeight: '700' },
  metricTotal: { color: c.tint, fontWeight: '900' },
  barTrack: { height: 8, backgroundColor: c.tintBackground, borderRadius: 4, overflow: 'hidden' },
  // cor da série do gráfico: igual nos dois temas
  barFill: { height: '100%', backgroundColor: '#1a73e8', borderRadius: 4 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.surfaceMuted },
  rowName: { flex: 1, marginRight: 8, color: c.textSecondary, fontWeight: '700' },
  rowTotal: { color: c.tint, fontWeight: '900' },
  empty: { color: c.textFaint, fontStyle: 'italic' },
  pdfButton: { backgroundColor: c.dangerButton, padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  pdfButtonText: { color: c.onButton, fontWeight: '900', fontSize: 15 },
}));
