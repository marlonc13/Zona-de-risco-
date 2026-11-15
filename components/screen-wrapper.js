import React, { useContext, useEffect, useRef } from 'react';
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
import { HeaderHeightContext } from '@react-navigation/elements';

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
  keyboardVerticalOffset, // padrão: altura do header da navegação
  extraBottomSpace = 40,
  dismissOnPress = true,
}) {
  const insets = useSafeAreaInsets();
  const { cores } = useTema();

  // O KeyboardAvoidingView mede a própria posição em relação ao pai, não à tela.
  // Sem descontar o header da Stack, o teclado continua cobrindo essa altura.
  const alturaHeader = useContext(HeaderHeightContext) ?? 0;

  const refInterno = useRef(null);
  const refScroll = scrollRef ?? refInterno;
  const scrollY = useRef(0);
  const alturaVisivel = useRef(0);

  // Ao abrir o teclado, rola até o campo focado ficar visível acima dele
  // (o ScrollView do Android já faz isso sozinho, o do iOS não).
  useEffect(() => {
    if (!scrollable) return;
    let timer;

    const sub = Keyboard.addListener('keyboardDidShow', () => {
      // espera o KeyboardAvoidingView aplicar o padding e o ScrollView encolher
      timer = setTimeout(() => {
        const input = TextInput.State.currentlyFocusedInput();
        const conteudo = refScroll.current?.getInnerViewRef();
        if (!input || !conteudo) return;

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
      }, 100);
    });

    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [scrollable, refScroll]);

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
    ? { behavior: 'padding', keyboardVerticalOffset: keyboardVerticalOffset ?? alturaHeader }
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
        onLayout={(e) => { alturaVisivel.current = e.nativeEvent.layout.height; }}
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
    <View style={containerStyle}>
      <Container style={{ flex: 1 }} {...containerProps}>
        {conteudo}
      </Container>
    </View>
  );
}
