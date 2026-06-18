import { StyleSheet, View, Text, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import app from '../../services/firebaseConfig';

const db = getFirestore(app);

function emojiDoTipo(tipo) {
  const tipos = [
    { label: 'Alagamento', emoji: '🌊' },
    { label: 'Deslizamento', emoji: '⛰️' },
    { label: 'Bloqueio', emoji: '🚧' },
    { label: 'Acidente', emoji: '⚠️' },
    { label: 'Outro', emoji: '📍' },
  ];
  return tipos.find(item => item.label === tipo)?.emoji || '📍';
}

export default function ListaAlertasScreen() {
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'marcacoes'), snapshot => {
      const agora = Date.now();
      const dados = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.expiresAt && item.expiresAt > agora)
        .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
      
      setAlertas(dados);
      setCarregando(false);
    }, erro => {
      console.error("Erro ao buscar lista:", erro);
      setCarregando(false);
    });

    return () => unsubscribe();
  }, []);

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alertas Ativos</Text>
        <Text style={styles.subtitle}>Zonas de risco relatadas recentemente</Text>
      </View>

      {alertas.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhum risco detectado no momento!</Text>
        </View>
      ) : (
        <FlatList
          data={alertas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Imagem do Alerta enviado pelo Firebase Storage */}
              {item.fotoUrl ? (
                <Image source={{ uri: item.fotoUrl }} style={styles.cardImage} />
              ) : (
                <View style={styles.noImagePlaceholder}>
                  <Text style={{ fontSize: 32 }}>{emojiDoTipo(item.tipo)}</Text>
                  <Text style={styles.noImageText}>Sem foto anexada</Text>
                </View>
              )}

              {/* Descrições e Informações */}
              <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>{emojiDoTipo(item.tipo)} {item.tipo}</Text>
                  <Text style={styles.cardTime}>
                    Expira às {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                
                <Text style={styles.cardDescription}>{item.comentario}</Text>
                
                <View style={styles.cardFooter}>
                  <Text style={styles.cardUser}>Relatado por: {item.userName}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

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