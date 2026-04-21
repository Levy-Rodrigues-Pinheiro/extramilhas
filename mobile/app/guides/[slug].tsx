import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useGuideBySlug, useToggleUpvote } from '../../src/hooks/useGuides';
import { Colors } from '../../src/lib/theme';

export default function GuideDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading } = useGuideBySlug(String(params.slug));
  const upvote = useToggleUpvote();

  const handleShare = async () => {
    if (!data) return;
    try {
      await Share.share({
        message: `${data.title}\n\n${data.summary}\n\nLer completo: https://milhasextras.com.br/guides/${data.slug}`,
      });
    } catch {
      /* cancelou */
    }
  };

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
        <Text style={styles.title} numberOfLines={1}>
          {data?.title ?? 'Guia'}
        </Text>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar"
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="share-outline" size={20} color={Colors.text.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary.light} />
        </View>
      ) : !data ? (
        <View style={styles.centerBox}>
          <Text style={{ color: Colors.text.secondary }}>Guia não encontrado</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.guideTitle}>{data.title}</Text>
          <Text style={styles.meta}>
            por {data.authorName} · {new Date(data.publishedAt).toLocaleDateString('pt-BR')}
          </Text>
          <Text style={styles.summary}>{data.summary}</Text>

          <View style={styles.statsRow}>
            <TouchableOpacity
              onPress={() => upvote.mutate(data.id)}
              disabled={upvote.isPending}
              style={[styles.upvoteBtn, data.upvotedByMe && styles.upvoteBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: data.upvotedByMe }}
              accessibilityLabel={`Upvote (${data.upvoteCount})`}
            >
              <Ionicons
                name={data.upvotedByMe ? 'heart' : 'heart-outline'}
                size={16}
                color={data.upvotedByMe ? '#fff' : Colors.red.primary}
              />
              <Text style={[styles.upvoteText, data.upvotedByMe && styles.upvoteTextActive]}>
                {data.upvoteCount}
              </Text>
            </TouchableOpacity>
            <Text style={styles.viewsText}>{data.viewCount} leituras</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.body}>{data.body}</Text>
        </ScrollView>
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
  title: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  guideTitle: { fontSize: 24, fontWeight: '800', color: Colors.text.primary, marginBottom: 8 },
  meta: { fontSize: 12, color: Colors.text.muted, marginBottom: 12 },
  summary: { fontSize: 15, color: Colors.text.secondary, fontStyle: 'italic', lineHeight: 22, marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.red.border,
    backgroundColor: Colors.red.bg,
  },
  upvoteBtnActive: {
    backgroundColor: Colors.red.primary,
    borderColor: Colors.red.primary,
  },
  upvoteText: { fontSize: 13, fontWeight: '700', color: Colors.red.primary },
  upvoteTextActive: { color: '#fff' },
  viewsText: { fontSize: 12, color: Colors.text.muted },
  divider: { height: 1, backgroundColor: Colors.border.default, marginBottom: 16 },
  body: { fontSize: 15, color: Colors.text.primary, lineHeight: 24 },
});
