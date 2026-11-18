import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, LayoutAnimation, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '../hooks/use-tema';

const DURACAO = 280;

// Espaço reservado no fim do painel (padding de baixo + barra de navegação), para a RolagemModal
const EspacoInferiorContexto = createContext(0);

// ScrollView para usar dentro do ModalDeslizante: rola até a borda de baixo do painel, em vez de
// ser cortada antes do espaço reservado (que aparecia como uma faixa branca acima dos botões do
// Android). Esse espaço vira o fim do conteúdo rolável, então o último item continua visível.
export function RolagemModal({ contentContainerStyle, style, ...props }) {
  const espaco = useContext(EspacoInferiorContexto);
  const conteudo = StyleSheet.flatten(contentContainerStyle) || {};
  return (
    <ScrollView
      {...props}
      style={[style, { marginBottom: -espaco }]}
      contentContainerStyle={[conteudo, { paddingBottom: (conteudo.paddingBottom ?? 0) + espaco }]}
    />
  );
}

// Modal de painel inferior: o fundo escuro aparece no lugar (fade) e só o painel desliza
// de baixo para cima. Ao fechar, faz o caminho inverso antes de desmontar o Modal.
//
// - estiloFundo: estilo do container que posiciona o painel (ex.: justifyContent: 'flex-end').
//   A cor de fundo dele é ignorada; o escurecimento é feito pela camada animada.
// - estiloPainel: estilo do painel que desliza. O espaço da barra de navegação / indicador
//   de início do aparelho é somado automaticamente ao paddingBottom dele. Conteúdo rolável
//   deve usar RolagemModal, para rolar até a borda sem deixar esse espaço vazio embaixo.
// - fecharAoTocarFora: toque fora do painel chama onFechar.
// - evitarTeclado: com o teclado aberto, o painel sobe até o topo dele (e encolhe se precisar).
// - sobreposto: conteúdo extra renderizado dentro do Modal, fora do painel (ex.: câmera).
// - aoTerminarDeFechar: chamado quando o modal saiu totalmente da tela (útil para abrir
//   outro modal, câmera ou galeria logo em seguida sem conflito no iOS).
export default function ModalDeslizante({
  visivel,
  onFechar,
  estiloFundo,
  estiloPainel,
  fecharAoTocarFora = true,
  evitarTeclado = false,
  sobreposto = null,
  aoTerminarDeFechar,
  children,
}) {
  const { cores } = useTema();
  const { height: alturaTela } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const animacao = useRef(new Animated.Value(0)).current;
  const [montado, setMontado] = useState(visivel);
  // Distância entre o topo do teclado e a base da tela (0 = teclado fechado)
  const [alturaTeclado, setAlturaTeclado] = useState(0);

  // O Modal é edge-to-edge no Android, então a janela não encolhe com o teclado e o
  // KeyboardAvoidingView erra a conta. Aqui a altura vem direto do evento do teclado:
  // - Android: o evento desconta a barra de navegação, que fica abaixo do teclado; somamos de volta.
  // - iOS: o evento já inclui a área do indicador de início.
  useEffect(() => {
    if (!evitarTeclado || !montado) return undefined;
    const ios = Platform.OS === 'ios';
    const aoMostrar = evento => {
      const altura = evento.endCoordinates?.height ?? 0;
      if (ios) LayoutAnimation.configureNext(LayoutAnimation.create(evento.duration || 250, 'keyboard', 'opacity'));
      setAlturaTeclado(ios ? altura : altura + insets.bottom);
    };
    const aoEsconder = evento => {
      if (ios) LayoutAnimation.configureNext(LayoutAnimation.create(evento?.duration || 250, 'keyboard', 'opacity'));
      setAlturaTeclado(0);
    };
    const mostrar = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', aoMostrar);
    const esconder = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', aoEsconder);
    return () => { mostrar.remove(); esconder.remove(); setAlturaTeclado(0); };
  }, [evitarTeclado, montado, insets.bottom]);

  // Abrir: monta o Modal; a animação de entrada roda depois que ele está na tela
  useEffect(() => {
    if (visivel) setMontado(true);
  }, [visivel]);

  useEffect(() => {
    if (!montado) return;
    Animated.timing(animacao, {
      toValue: visivel ? 1 : 0,
      duration: DURACAO,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Fechar: só desmonta quando a animação de saída termina (se reabrir no meio, continua montado)
      if (finished && !visivel) {
        setMontado(false);
        // no iOS o aviso vem pelo onDismiss, quando o Modal nativo termina de sair
        if (Platform.OS !== 'ios') aoTerminarDeFechar?.();
      }
    });
  }, [montado, visivel, animacao]); // eslint-disable-line react-hooks/exhaustive-deps

  const translateY = animacao.interpolate({ inputRange: [0, 1], outputRange: [alturaTela, 0] });

  // O Modal ocupa a tela inteira (edge-to-edge), inclusive atrás da barra de navegação do
  // Android; por isso o painel ganha a altura dela no espaço de baixo.
  const plano = StyleSheet.flatten(estiloPainel) || {};
  const paddingBaseInferior = plano.paddingBottom ?? plano.paddingVertical ?? plano.padding ?? 0;
  // Com o teclado aberto, ele cobre a barra de navegação: não soma esse espaço (era a faixa
  // branca acima do teclado) e limita a altura do painel ao espaço que sobrou acima dele.
  const tecladoAberto = evitarTeclado && alturaTeclado > 0;
  const espacoInferior = tecladoAberto
    ? { paddingBottom: paddingBaseInferior, maxHeight: alturaTela - alturaTeclado - insets.top - 12 }
    : { paddingBottom: paddingBaseInferior + insets.bottom };
  const Conteudo = fecharAoTocarFora ? TouchableOpacity : View;
  const propsConteudo = fecharAoTocarFora ? { activeOpacity: 1, onPress: onFechar } : {};

  const painel = (
    <Conteudo style={[estiloFundo, styles.semFundo, tecladoAberto && { paddingBottom: alturaTeclado }]} {...propsConteudo}>
      <Animated.View
        // impede que o toque dentro do painel chegue ao fundo e feche o modal
        onStartShouldSetResponder={() => true}
        style={[estiloPainel, espacoInferior, { transform: [{ translateY }] }]}
      >
        <EspacoInferiorContexto.Provider value={espacoInferior.paddingBottom}>
          {children}
        </EspacoInferiorContexto.Provider>
      </Animated.View>
    </Conteudo>
  );

  return (
    <Modal
      visible={montado}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onFechar}
      onDismiss={Platform.OS === 'ios' ? aoTerminarDeFechar : undefined}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: cores.overlay, opacity: animacao }]} />
      {painel}
      {sobreposto}
    </Modal>
  );
}

const styles = StyleSheet.create({
  semFundo: { backgroundColor: 'transparent' },
});
