import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useGuides, GuideSummary } from '../../src/hooks/useGuides';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/lib/theme';

export default function GuidesListScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = useGuides();

  const renderItem = ({ item }: { item: GuideSummary }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/guides/${item.slug}` as any)}
      activeOpacity={0.75}
      accessibilityRole="link"
      accessibilityLabel={`Guia ${item.title} por ${item.authorName}, ${item.upvoteCount} upvotes`}
    >
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.cardSummary} numberOfLines={3}>
        {item.summary}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.author}>por {item.authorName}</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="heart" size={12} color={Colors.red.primary} />
            <Text style={styles.statText}>{item.upvoteCount}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={12} color={Colors.text.muted} />
            <Text style={styles.statText}>{item.viewCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Guias da comunidade</Text>
        <TouchableOpacity
          onPress={() => router.push('/guides/new' as any)}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Escrever novo guia"
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary.light} />
        </View>
      ) : !data?.items || data.items.length === 0 ? (
        <EmptyState
          icon="book-outline"
          title="Nenhum guia ainda"
          description="Seja o primeiro a escrever um guia sobre milhas e ajudar a comunidade."
        />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(g) => g.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.start,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginBottom: 6 },
  cardSummary: { fontSize: 13, color: Colors.text.secondary, lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  author: { fontSize: 11, color: Colors.text.muted },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, color: Colors.text.muted, fontWeight: '600' },
});
