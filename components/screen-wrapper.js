import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '../hooks/use-tema';

// Espaço entre o campo focado e o topo do teclado
const MARGEM_TECLADO = 24;

export function useScrollToSection() {
  const scrollRef = useRef(null);
  const posicao = useRef(0);

  const onLayout = (e) => {
    posicao.current = e.nativeEvent.layout.y;
  };

  const rolarParaSecao = (offset = 20) => {
    const deslocamento = typeof offset === 'number' ? offset : 20;
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(posicao.current - deslocamento, 0),
        animated: true,
      });
    }, 150);
  };

  return { scrollRef, onLayout, rolarParaSecao };
}

export default function ScreenWrapper({
  children,
  style,
  scrollable = false,
  scrollRef,
  backgroundColor, // padrão: cores.surface do tema ativo
  includeTop = true,
  includeBottom = true,
  keyboardAvoiding = true,
  keyboardVerticalOffset, // padrão: distância do topo do aparelho até a tela (header incluído)
  extraBottomSpace = 40,
  dismissOnPress = true,
}) {
  const insets = useSafeAreaInsets();
  const { cores } = useTema();

  // O KeyboardAvoidingView mede a própria posição em relação ao pai, não à tela: o offset é
  // a distância do topo do aparelho até a tela (o header da Stack fica acima). Ela é medida
  // aqui em vez de vir do HeaderHeightContext, que no Android chega a informar a altura do
  // header em pixels (256 em vez de 85) e fazia o KAV subir a tela muito além do teclado.
  // Usa o pageY do measure (relativo à raiz, que começa no topo da tela, como o screenY do
  // teclado). O measureInWindow não serve: no Android a janela começa abaixo da status bar.
  const refTela = useRef(null);
  const [topoNaTela, setTopoNaTela] = useState(0);
  const medirTopo = () => {
    refTela.current?.measure((_x, _y, _largura, _altura, _pageX, pageY) => {
      if (Number.isFinite(pageY)) setTopoNaTela(pageY);
    });
  };

  const refInterno = useRef(null);
  const refScroll = scrollRef ?? refInterno;
  const scrollY = useRef(0);
  const alturaVisivel = useRef(0);

  // Ao abrir o teclado, rola até o campo focado ficar inteiro visível acima dele
  // (a rolagem automática do Android acontece antes de o ScrollView encolher e deixava
  // o campo cortado; a do iOS não existe).
  const mostrarCampoFocado = () => {
    const input = TextInput.State.currentlyFocusedInput();
    const conteudo = refScroll.current?.getInnerViewRef?.();
    if (!input || !conteudo || !Keyboard.isVisible()) return;

    input.measureLayout(
      conteudo,
      (_x, y, _largura, altura) => {
        const baseDoCampo = y + altura + MARGEM_TECLADO;
        const baseVisivel = scrollY.current + alturaVisivel.current;
        if (baseDoCampo > baseVisivel) {
          refScroll.current?.scrollTo({ y: baseDoCampo - alturaVisivel.current, animated: true });
        }
      },
      () => {},
    );
  };

  useEffect(() => {
    if (!scrollable) return;
    let timer;

    // espera o KeyboardAvoidingView aplicar o padding e o ScrollView encolher; se ele
    // encolher depois disso, o onLayout do ScrollView refaz a conta
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      clearTimeout(timer);
      timer = setTimeout(mostrarCampoFocado, 100);
    });

    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [scrollable, refScroll]); // eslint-disable-line react-hooks/exhaustive-deps

  // As margens seguras ficam numa View por fora porque o KeyboardAvoidingView
  // substitui o paddingBottom do próprio style pela altura do teclado.
  const containerStyle = {
    flex: 1,
    backgroundColor: backgroundColor ?? cores.surface,
    paddingTop: includeTop ? insets.top : 0,
    paddingBottom: includeBottom ? insets.bottom : 0,
  };

  const Container = keyboardAvoiding ? KeyboardAvoidingView : View;
  const containerProps = keyboardAvoiding
    ? { behavior: 'padding', keyboardVerticalOffset: keyboardVerticalOffset ?? topoNaTela }
    : {};

  let conteudo;

  if (scrollable) {
    conteudo = (
      <ScrollView
        ref={refScroll}
        contentContainerStyle={[
          { flexGrow: 1, width: '100%', paddingBottom: extraBottomSpace },
          style,
        ]}
        onLayout={(e) => {
          alturaVisivel.current = e.nativeEvent.layout.height;
          // o ScrollView acabou de encolher por causa do teclado
          if (Keyboard.isVisible()) requestAnimationFrame(mostrarCampoFocado);
        }}
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {children}
      </ScrollView>
    );
  } else if (dismissOnPress) {
    conteudo = (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[{ flex: 1, width: '100%' }, style]}>{children}</View>
      </TouchableWithoutFeedback>
    );
  } else {
    conteudo = <View style={[{ flex: 1, width: '100%' }, style]}>{children}</View>;
  }

  return (
    <View ref={refTela} style={containerStyle} onLayout={keyboardAvoiding ? medirTopo : undefined}>
      <Container style={{ flex: 1 }} {...containerProps}>
        {conteudo}
      </Container>
    </View>
  );
}
