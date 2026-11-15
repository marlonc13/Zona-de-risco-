import { Platform } from 'react-native';
import { criarEstilos } from '../hooks/use-tema';

// Cores que só esta tela usa (as comuns vêm de constants/theme.js)
const locais = {
  light: { campoFundo: '#f8fafd', sombra: 0.08 },
  dark: { campoFundo: '#18191b', sombra: 0.3 },
};

export default criarEstilos((c, tema) => {
  const l = locais[tema];
  const sombra = {
    shadowColor: '#000',
    shadowOpacity: l.sombra,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  };

  return {
    container: { padding: 18, paddingTop: 20 },

    // Cabeçalho
    headerCard: { backgroundColor: c.surface, borderRadius: 24, paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1, borderColor: c.borderSoft, ...sombra },
    avatar: { width: 116, height: 116, borderRadius: 58, backgroundColor: c.tintBackground, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: c.tintBorder },
    avatarImage: { width: '100%', height: '100%' },
    avatarBadge: { position: 'absolute', right: 2, bottom: 2, width: 34, height: 34, borderRadius: 17, backgroundColor: c.button, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.surface },
    name: { color: c.textStrong, fontSize: 22, fontWeight: '900', marginTop: 14, textAlign: 'center' },
    email: { color: c.textMuted, fontSize: 14, marginTop: 3, textAlign: 'center' },
    unsavedHint: { color: c.warning, backgroundColor: c.warningBackground, fontSize: 12, fontWeight: '700', textAlign: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginTop: 12, overflow: 'hidden' },

    // Seções
    sectionTitle: { color: c.textMuted, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 22, marginBottom: 8, marginLeft: 4 },
    card: { backgroundColor: c.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: c.borderSoft, ...sombra },

    // Formulário
    label: { color: c.textSecondary, fontSize: 13, fontWeight: '800', marginBottom: 6 },
    labelSpacing: { marginTop: 14 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: l.campoFundo, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 12 },
    inputRowDisabled: { backgroundColor: c.surfaceMuted, borderColor: c.borderSoft },
    input: { flex: 1, color: c.textStrong, fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 13 : 10 },
    inputDisabled: { color: c.textMuted },
    saveButton: { backgroundColor: c.button, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
    saveButtonText: { color: c.onButton, fontSize: 16, fontWeight: '800' },
    disabledButton: { opacity: 0.6 },

    // Menu de atalhos
    menuCard: { paddingVertical: 4, paddingHorizontal: 14 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    menuRowDivider: { borderTopWidth: 1, borderTopColor: c.borderSoft },
    menuIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    menuTextArea: { flex: 1 },
    menuLabel: { color: c.textStrong, fontSize: 15, fontWeight: '800' },
    menuDescription: { color: c.textMuted, fontSize: 12, marginTop: 2 },

    // Sair
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: c.danger, backgroundColor: c.dangerBackground },
    logoutText: { flexShrink: 1, color: c.danger, fontSize: 15, fontWeight: '800' },

    // Painel de opções da foto
    sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 20 },
    sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, alignSelf: 'center', marginBottom: 14 },
    sheetTitle: { color: c.textStrong, fontSize: 18, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
    sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
    sheetOptionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    sheetOptionText: { flex: 1, color: c.textStrong, fontSize: 16, fontWeight: '700' },
    sheetCancel: { marginTop: 10, paddingVertical: 14, borderRadius: 14, backgroundColor: c.surfaceMuted, alignItems: 'center' },
    sheetCancelText: { color: c.textSecondary, fontSize: 15, fontWeight: '800' },
  };
});
