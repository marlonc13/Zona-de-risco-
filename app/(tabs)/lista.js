import { View, Text, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import app from '../../services/firebaseConfig';
import styles from '../../styles/lista.styles';

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