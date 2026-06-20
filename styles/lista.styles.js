import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eef2f5' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1c1e' },
  subtitle: { fontSize: 13, color: '#6c757d', marginTop: 2 },
  emptyText: { fontSize: 16, color: '#5f6368', fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  cardImage: { width: '100%', height: 200, resizeMode: 'cover' },
  noImagePlaceholder: { width: '100%', height: 100, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', gap: 4 },
  noImageText: { fontSize: 12, color: '#6c757d', fontWeight: '600' },
  cardContent: { padding: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1a1c1e' },
  cardTime: { fontSize: 12, color: '#1a73e8', fontWeight: '600', backgroundColor: '#e8f0fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardDescription: { fontSize: 14, color: '#3c4043', lineHeight: 22, marginBottom: 12 },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#f1f3f4', paddingTop: 10 },
  cardUser: { fontSize: 12, color: '#747775', fontStyle: 'italic' }
});

export default styles;
