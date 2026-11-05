import React, { useRef } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  backgroundColor = '#ffffff',
  includeTop = true,
  includeBottom = true,
  keyboardAvoiding = true,
  keyboardVerticalOffset = 0,
  extraBottomSpace = 40,
  dismissOnPress = true,
}) {
  const insets = useSafeAreaInsets();

  const containerStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: includeTop ? insets.top : 0,
    paddingBottom: includeBottom ? insets.bottom : 0,
  };

  const Container = keyboardAvoiding ? KeyboardAvoidingView : View;
  const containerProps = keyboardAvoiding
    ? { behavior: 'padding', keyboardVerticalOffset }
    : {};

  if (scrollable) {
    return (
      <Container style={containerStyle} {...containerProps}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            { flexGrow: 1, width: '100%', paddingBottom: extraBottomSpace },
            style,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          {children}
        </ScrollView>
      </Container>
    );
  }

  if (!dismissOnPress) {
  return (
      <Container style={containerStyle} {...containerProps}>
        <View style={[{ flex: 1, width: '100%' }, style]}>{children}</View>
      </Container>
    );
  }

  return (
    <Container style={containerStyle} {...containerProps}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[{ flex: 1, width: '100%' }, style]}>{children}</View>
      </TouchableWithoutFeedback>
    </Container>
  );
}