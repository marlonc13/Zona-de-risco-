import { criarEstilos } from '../hooks/use-tema';

// Cores que só esta tela usa (as comuns vêm de constants/theme.js)
const locais = {
  light: { bordaAzul: '#aecbfa', bordaVerde: '#a8dab5', bordaVermelha: '#f4c7c3', recenteTexto: '#d2e3fc', privacidadeTitulo: '#174ea6' },
  dark: { bordaAzul: '#2b4a75', bordaVerde: '#2d5f3c', bordaVermelha: '#6b2b27', recenteTexto: '#d2e3fc', privacidadeTitulo: '#aecbfa' },
};

export default criarEstilos((c, tema) => {
  const l = locais[tema];
  return {
    container: { flex: 1, backgroundColor: c.screen }, content: { padding: 17, paddingTop: 50, paddingBottom: 120 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.screen }, loading: { color: c.textMuted, marginTop: 10 },
    title: { color: c.textStrong, fontSize: 27, fontWeight: '900' }, subtitle: { color: c.textMuted, lineHeight: 20, marginTop: 6, marginBottom: 17 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, summaryCard: { width: '48%', minHeight: 108, borderRadius: 16, padding: 14, justifyContent: 'space-between', borderWidth: 1 }, blueCard: { backgroundColor: c.tintBackground, borderColor: l.bordaAzul }, greenCard: { backgroundColor: c.successBackground, borderColor: l.bordaVerde }, redCard: { backgroundColor: c.dangerBackground, borderColor: l.bordaVermelha }, grayCard: { backgroundColor: c.surfaceMuted, borderColor: c.border }, summaryNumber: { color: c.textStrong, fontSize: 30, fontWeight: '900' }, summaryLabel: { color: c.textSecondary, fontSize: 12, fontWeight: '800', lineHeight: 16 },
    recentBox: { backgroundColor: c.button, borderRadius: 16, padding: 15, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 13 }, recentNumber: { color: c.onButton, fontSize: 34, fontWeight: '900' }, recentTitle: { color: c.onButton, fontWeight: '900' }, recentText: { color: l.recenteTexto, fontSize: 11, lineHeight: 15, marginTop: 2 },
    section: { backgroundColor: c.surface, borderRadius: 17, padding: 15, marginTop: 13, borderWidth: 1, borderColor: c.borderSoft }, sectionTitle: { color: c.textStrong, fontSize: 17, fontWeight: '900', marginBottom: 12 },
    mapHelp: { color: c.textMuted, fontSize: 11, lineHeight: 16, marginTop: -6, marginBottom: 10 }, heatmap: { width: '100%', height: 245, borderRadius: 13, overflow: 'hidden' }, mapGradient: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 10 }, mapColor: { flex: 1 }, mapLegendLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }, mapLegendText: { color: c.textMuted, fontSize: 9 }, mapCount: { color: c.textSecondary, fontSize: 11, fontWeight: '800', marginTop: 7 },
    barItem: { marginBottom: 11 }, barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }, barLabel: { flex: 1, marginRight: 8, color: c.textSecondary, fontSize: 12, fontWeight: '700' }, barValue: { color: c.textStrong, fontSize: 12, fontWeight: '900' }, barTrack: { height: 9, backgroundColor: c.surfaceMuted, borderRadius: 5, overflow: 'hidden' }, barFill: { height: '100%', borderRadius: 5 }, empty: { color: c.textFaint, fontStyle: 'italic' },
    privacyBox: { backgroundColor: c.tintSoft, borderWidth: 1, borderColor: c.tintBorder, borderRadius: 15, padding: 13, marginTop: 13 }, privacyTitle: { color: l.privacidadeTitulo, fontWeight: '900' }, privacyText: { color: c.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 4 },
  };
});
