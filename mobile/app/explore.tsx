import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExplore } from '../src/hooks/useExplore';
import { ExploreSection } from '../src/components/ExploreSection';
import { EmptyState } from '../src/components/EmptyState';
import { Colors } from '../src/lib/theme';

export default function ExploreScreen() {
  const { data, isLoading, isError } = useExplore();

  const sections = data?.sections ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Explorar</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.start} />
          <Text style={styles.loadingText}>Carregando ofertas...</Text>
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Erro ao carregar"
          description="Não foi possível carregar as ofertas. Verifique sua conexão e tente novamente."
        />
      ) : sections.length === 0 ? (
        <EmptyState
          icon="compass-outline"
          title="Nada por aqui"
          description="Não encontramos ofertas para exibir no momento. Volte mais tarde!"
        />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section: any, index: number) => (
            <ExploreSection
              key={index}
              title={section.title}
              icon={section.icon}
              offers={section.offers ?? []}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.card,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});
