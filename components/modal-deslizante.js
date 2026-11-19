import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, LayoutAnimation, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '../hooks/use-tema';

const DURACAO = 280;
// Espaço entre o campo focado e o topo do teclado
const MARGEM_TECLADO = 24;
// Tempo para o painel terminar de se ajustar ao teclado antes de medir o campo
const ESPERA_AJUSTE_TECLADO = 120;

// Espaço reservado no fim do painel (padding de baixo + barra de navegação), para a RolagemModal
const EspacoInferiorContexto = createContext(0);

// ScrollView para usar dentro do ModalDeslizante: rola até a borda de baixo do painel, em vez de
// ser cortada antes do espaço reservado (que aparecia como uma faixa branca acima dos botões do
// Android). Esse espaço vira o fim do conteúdo rolável, então o último item continua visível.
//
// Com o teclado aberto, rola até o campo focado ficar inteiro acima dele. A rolagem automática
// do Android acontece antes de o painel encolher para caber acima do teclado, então sozinha ela
// deixava o campo cortado ou escondido; aqui a conta é refeita depois que o painel se ajusta.
export function RolagemModal({ contentContainerStyle, style, onLayout, onScroll, ...props }) {
  const espaco = useContext(EspacoInferiorContexto);
  const conteudo = StyleSheet.flatten(contentContainerStyle) || {};
  const refScroll = useRef(null);
  const scrollY = useRef(0);
  const alturaVisivel = useRef(0);
  // em ref: o listener do teclado é registrado uma vez e precisa do valor atual
  const espacoAtual = useRef(espaco);
  espacoAtual.current = espaco;
  // Último campo ajustado: um toque só rola de novo se o foco mudou de campo
  const ultimoCampo = useRef(null);

  const mostrarCampoFocado = () => {
    const input = TextInput.State.currentlyFocusedInput();
    const interno = refScroll.current?.getInnerViewRef?.();
    if (!input || !interno || !Keyboard.isVisible()) return;
    ultimoCampo.current = input;
    input.measureLayout(
      interno,
      (_x, y, _largura, altura) => {
        // a faixa final (padding do painel e, sem teclado, a barra de navegação) não é área útil
        const areaUtil = alturaVisivel.current - espacoAtual.current;
        const baseDoCampo = y + altura + MARGEM_TECLADO;
        if (baseDoCampo > scrollY.current + areaUtil) {
          refScroll.current?.scrollTo({ y: baseDoCampo - areaUtil, animated: true });
        } else if (y - MARGEM_TECLADO < scrollY.current) {
          refScroll.current?.scrollTo({ y: Math.max(y - MARGEM_TECLADO, 0), animated: true });
        }
      },
      () => {}, // campo fora desta rolagem
    );
  };

  // Teclado abriu sem o painel mudar de tamanho; ao fechar, o próximo foco conta como novo
  const timer = useRef(null);
  const agendar = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(mostrarCampoFocado, ESPERA_AJUSTE_TECLADO);
  };
  useEffect(() => {
    const mostrou = Keyboard.addListener('keyboardDidShow', agendar);
    const escondeu = Keyboard.addListener('keyboardDidHide', () => { ultimoCampo.current = null; });
    return () => { mostrou.remove(); escondeu.remove(); clearTimeout(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScrollView
      {...props}
      ref={refScroll}
      style={[style, { marginBottom: -espaco }]}
      contentContainerStyle={[conteudo, { paddingBottom: (conteudo.paddingBottom ?? 0) + espaco }]}
      onLayout={e => {
        alturaVisivel.current = e.nativeEvent.layout.height;
        // o painel acabou de encolher (ou crescer) por causa do teclado
        if (Keyboard.isVisible()) requestAnimationFrame(mostrarCampoFocado);
        onLayout?.(e);
      }}
      onScroll={e => {
        scrollY.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      }}
      scrollEventThrottle={props.scrollEventThrottle ?? 16}
      // Trocou de campo com o teclado já aberto: nem o teclado nem o painel mudam de tamanho
      onTouchEnd={e => {
        if (Keyboard.isVisible()) {
          setTimeout(() => {
            if (TextInput.State.currentlyFocusedInput() !== ultimoCampo.current) mostrarCampoFocado();
          }, ESPERA_AJUSTE_TECLADO);
        }
        props.onTouchEnd?.(e);
      }}
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
//   Ligado por padrão: todo painel com campo de texto precisa disso.
// - sobreposto: conteúdo extra renderizado dentro do Modal, fora do painel (ex.: câmera).
// - aoTerminarDeFechar: chamado quando o modal saiu totalmente da tela (útil para abrir
//   outro modal, câmera ou galeria logo em seguida sem conflito no iOS).
export default function ModalDeslizante({
  visivel,
  onFechar,
  estiloFundo,
  estiloPainel,
  fecharAoTocarFora = true,
  evitarTeclado = true,
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
