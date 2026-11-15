import { Colors } from '../constants/theme';
import { useTema } from './use-tema';

// Segue o tema escolhido no app (e não só o do aparelho)
export function useThemeColor(props, colorName) {
  const { tema } = useTema();
  const colorFromProps = props[tema];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[tema][colorName];
  }
}
