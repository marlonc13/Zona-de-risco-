import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  icon: {
    fontSize: 42,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionCard: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTextArea: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontWeight: 'bold',
  },
  description: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.8,
  },
  bigText: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  deleteButton: {
    width: '100%',
    backgroundColor: '#c62828',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default styles;
