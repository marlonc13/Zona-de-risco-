import { criarEstilos } from '../hooks/use-tema';

export const locais = {
  light: { overlay: 'rgba(255,255,255,0.84)', subtitulo: '#444', placeholder: '#777' },
  dark: { overlay: 'rgba(30,31,34,0.88)', subtitulo: '#bdc1c6', placeholder: '#80868b' },
};

export default criarEstilos((c, tema) => {
  const l = locais[tema];
  return {
    container: { flex: 1 },
    overlay: { flex: 1, backgroundColor: l.overlay },
    content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 40 },
    // Logo sem fundo: a imagem já é transparente
    logo: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    logoImagem: { width: '100%', height: '100%' },
    title: { fontSize: 28, fontWeight: '900', color: c.textStrong },
    subtitle: { fontSize: 15, color: l.subtitulo, textAlign: 'center', marginTop: 8, marginBottom: 22, lineHeight: 21 },
    input: { width: '100%', backgroundColor: c.surface, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border, color: c.textStrong },
    passwordBox: { width: '100%', backgroundColor: c.surface, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center' },
    passwordInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, color: c.textStrong },
    eyeButton: { paddingHorizontal: 13, paddingVertical: 10 },
    eyeText: { fontSize: 18 },
    button: { width: '100%', backgroundColor: c.button, paddingVertical: 15, borderRadius: 15, alignItems: 'center', marginTop: 4 },
    buttonText: { color: c.onButton, fontSize: 16, fontWeight: '800' },
    linkButton: { marginTop: 15, padding: 8 },
    linkText: { color: c.tint, fontWeight: '800' },
    visitanteButton: { width: '100%', backgroundColor: c.surface, paddingVertical: 14, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: c.border, marginTop: 8 },
    visitanteText: { color: c.tint, fontWeight: '800', fontSize: 15 },
    voltarButton: { marginTop: 10, padding: 8 },
    voltarText: { color: c.textMuted, fontWeight: '700' },
  };
});
