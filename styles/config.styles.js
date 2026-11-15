import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20, // espaço inferior vem do ScreenWrapper (extraBottomSpace + inset)
  },

  // Cabeçalho
  headerIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(128,128,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.65,
    marginBottom: 28,
    textAlign: 'center',
  },

  // Seções
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.55,
    marginTop: 12,
    marginLeft: 4,
  },

  // Cards
  optionCard: {
    width: '100%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextArea: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    marginTop: 3,
    opacity: 0.7,
  },

  // Seletor de tema
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  themeOptionActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  themeOptionText: {
    flexShrink: 1,
    fontWeight: '700',
    fontSize: 14,
  },

  // Troca de senha (conteúdo expandido)
  passwordArea: {
    marginTop: 14,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
    backgroundColor: 'rgba(128,128,128,0.12)',
    paddingHorizontal: 12,
    marginTop: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Excluir conta
  deleteButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#c62828',
    backgroundColor: 'rgba(198,40,40,0.08)',
    padding: 15,
    borderRadius: 16,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#e53935',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default styles;