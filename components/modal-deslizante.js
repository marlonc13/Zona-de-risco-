import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '../hooks/use-tema';

const DURACAO = 280;

// Modal de painel inferior: o fundo escuro aparece no lugar (fade) e só o painel desliza
// de baixo para cima. Ao fechar, faz o caminho inverso antes de desmontar o Modal.
//
// - estiloFundo: estilo do container que posiciona o painel (ex.: justifyContent: 'flex-end').
//   A cor de fundo dele é ignorada; o escurecimento é feito pela camada animada.
// - estiloPainel: estilo do painel que desliza. O espaço da barra de navegação / indicador
//   de início do aparelho é somado automaticamente ao paddingBottom dele.
// - fecharAoTocarFora: toque fora do painel chama onFechar.
// - evitarTeclado: envolve o conteúdo em KeyboardAvoidingView.
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
  const espacoInferior = { paddingBottom: paddingBaseInferior + insets.bottom };
  const Conteudo = fecharAoTocarFora ? TouchableOpacity : View;
  const propsConteudo = fecharAoTocarFora ? { activeOpacity: 1, onPress: onFechar } : {};

  const painel = (
    <Conteudo style={[estiloFundo, styles.semFundo]} {...propsConteudo}>
      <Animated.View
        // impede que o toque dentro do painel chegue ao fundo e feche o modal
        onStartShouldSetResponder={() => true}
        style={[estiloPainel, espacoInferior, { transform: [{ translateY }] }]}
      >
        {children}
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
      {evitarTeclado ? (
        <KeyboardAvoidingView style={styles.preencher} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {painel}
        </KeyboardAvoidingView>
      ) : painel}
      {sobreposto}
    </Modal>
  );
}

const styles = StyleSheet.create({
  preencher: { flex: 1 },
  semFundo: { backgroundColor: 'transparent' },
});
