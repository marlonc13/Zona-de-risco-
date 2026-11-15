import { criarEstilos } from '../hooks/use-tema';

const locais = {
  light: { overlay: 'rgba(255,255,255,0.82)', subtitulo: '#444' },
  dark: { overlay: 'rgba(30,31,34,0.86)', subtitulo: '#bdc1c6' },
};

export default criarEstilos((c, tema) => {
  const l = locais[tema];
  return {
    container: { flex: 1 },
    overlay: { flex: 1, backgroundColor: l.overlay, justifyContent: 'center', alignItems: 'center', padding: 28 },
    // Logo sem fundo: a imagem já é transparente
    logo: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    logoImagem: { width: '100%', height: '100%' },
    title: { fontSize: 30, fontWeight: '900', color: c.textStrong },
    subtitle: { fontSize: 16, color: l.subtitulo, textAlign: 'center', marginTop: 10, marginBottom: 28, lineHeight: 22 },
    primaryButton: { width: '100%', backgroundColor: c.button, paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
    primaryText: { color: c.onButton, fontSize: 16, fontWeight: '800' },
    secondaryButton: { width: '100%', backgroundColor: c.surface, paddingVertical: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    secondaryText: { color: c.tint, fontSize: 16, fontWeight: '800' },
    note: { marginTop: 18, color: c.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 18 },
  };
});
