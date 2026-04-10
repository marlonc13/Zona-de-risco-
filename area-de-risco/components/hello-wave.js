import Animated from 'react-native-reanimated';

export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize,
        lineHeight,
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount,
        animationDuration: '300ms',
      }}>
      
    </Animated.Text>
  );
}
