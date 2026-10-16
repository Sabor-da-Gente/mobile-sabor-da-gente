import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Paleta } from '@/constants/paleta';
import { listarCategorias } from '@/services/cardapioService';

export default function CardapioScreen() {
  const categorias = listarCategorias();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.botaoVoltarTexto}>← Voltar ao início</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Cardápio 🍕</Text>
          <Text style={styles.subtitle}>Escolha uma categoria</Text>
        </View>

        <View style={styles.categories}>
          {categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria.id}
              style={styles.category}
              onPress={() => router.push(`/categoria/${categoria.id}`)}
            >
              <Text style={styles.icon}>{categoria.emoji}</Text>
              <Text style={styles.categoryTitle}>{categoria.titulo}</Text>
              <Text style={styles.categoryDescription}>{categoria.descricao}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Paleta.fundo },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  botaoVoltar: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    backgroundColor: Paleta.destaque,
  },
  botaoVoltarTexto: { color: Paleta.primaria, fontSize: 15, fontWeight: 'bold' },
  title: { fontSize: 28, fontWeight: 'bold', color: Paleta.primaria, marginBottom: 6 },
  subtitle: { fontSize: 16, color: Paleta.textoSecundario },
  categories: { padding: 20, gap: 14 },
  category: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: Paleta.superficie,
    borderWidth: 1,
    borderColor: Paleta.borda,
  },
  icon: { fontSize: 36, marginBottom: 10 },
  categoryTitle: { fontSize: 19, fontWeight: 'bold', color: Paleta.texto, marginBottom: 5 },
  categoryDescription: { fontSize: 14, color: Paleta.textoSuave },
});