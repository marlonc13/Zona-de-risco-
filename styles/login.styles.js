import { criarEstilos } from '../hooks/use-tema';

// Cores que só esta tela usa (as comuns vêm de constants/theme.js)
const locais = {
  light: { overlay: 'rgba(255,255,255,0.78)', subtitulo: '#444' },
  dark: { overlay: 'rgba(30,31,34,0.84)', subtitulo: '#bdc1c6' },
};

export default criarEstilos((c, tema) => {
  const l = locais[tema];
  return {
    container: { flex: 1 },
    overlay: { flex: 1, backgroundColor: l.overlay, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
    // Fundo branco fixo: faz parte da logo
    avatar: { width: 95, height: 95, borderRadius: 48, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 10, overflow: 'hidden' },
    // Estilo novo para controlar o tamanho da logo dentro do círculo
    logoImagem: { width: '70%', height: '70%' }, 
    nome: { fontSize: 26, fontWeight: 'bold', color: c.textStrong },
    subtitulo: { fontSize: 15, color: l.subtitulo, marginTop: 8, marginBottom: 28, textAlign: 'center', lineHeight: 21 },
    emailBotao: { marginTop: 14, backgroundColor: c.surface, width: '100%', paddingVertical: 14, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    emailTexto: { color: c.tint, fontWeight: '800', fontSize: 15 },
    visitanteBotao: { marginTop: 14, backgroundColor: c.button, width: '100%', paddingVertical: 14, borderRadius: 15, alignItems: 'center' },
    visitanteTexto: { color: c.onButton, fontWeight: '800', fontSize: 16 },
    voltarBotao: { marginTop: 12, padding: 10 },
    voltarTexto: { color: c.tint, fontWeight: '700' },
  };
});
