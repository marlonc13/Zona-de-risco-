import { StyleSheet } from 'react-native';

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

export default styles;
