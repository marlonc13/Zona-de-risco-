import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

export function IconSymbol({ name, size = 24, color, style, weight = 'regular' }) {
  return (
    <SymbolView
      name={name}
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}