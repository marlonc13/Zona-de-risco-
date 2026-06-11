import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { IconSymbol } from './icon-symbol';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

export function Collapsible({ children, title }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={theme === 'light' ? Colors.light.icon : Colors.dark.icon}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />

        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title}
        </ThemedText>
      </TouchableOpacity>

      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // define gap entre ícone e texto
  },
  title: {
    marginLeft: 8, // espaço entre ícone e texto se gap não funcionar em RN
  },
  content: {
    marginTop: 10,
    marginLeft: 10,
  },
});