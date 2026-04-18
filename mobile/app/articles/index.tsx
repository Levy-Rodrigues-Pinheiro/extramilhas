import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useArticles } from '../../src/hooks/useArticles';
import { useAuthStore } from '../../src/store/auth.store';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/lib/theme';
import type { Article } from '../../src/types';

const CATEGORY_COLORS: Record<string, string> = {
  Guias: '#3B82F6',
  Dicas: '#22c55e',
  Notícias: '#f59e0b',
  Tutoriais: '#3b82f6',
  Avaliações: '#8b5cf6',
};

function getExcerpt(body: string): string {
  const clean = body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  return clean.length > 100 ? clean.slice(0, 100) + '...' : clean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function ArticleCard({ article, isPro }: { article: Article; isPro: boolean }) {
  const isLocked = (article as Article & { isProOnly?: boolean }).isProOnly && !isPro;
  const catColor = CATEGORY_COLORS[article.category] ?? '#3B82F6';
  const excerpt = getExcerpt(article.body);

  const handlePress = () => {
    if (isLocked) {
      router.push('/subscription');
    } else {
      router.push(`/articles/${article.slug}`);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isLocked && styles.cardLocked]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: `${catColor}20`, borderColor: catColor },
          ]}
        >
          <Text style={[styles.categoryText, { color: catColor }]}>{article.category}</Text>
        </View>
        {(article as Article & { isProOnly?: boolean }).isProOnly && (
          <View style={styles.proBadge}>
            <Ionicons name="star" size={10} color="#a78bfa" />
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        )}
        {isLocked && (
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={14} color="#475569" />
          </View>
        )}
      </View>

      <Text style={[styles.cardTitle, isLocked && styles.cardTitleLocked]} numberOfLines={2}>
        {article.title}
      </Text>
      <Text style={styles.cardExcerpt} numberOfLines={3}>
        {excerpt}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{formatDate(article.publishedAt)}</Text>
        <Ionicons
          name={isLocked ? 'lock-closed-outline' : 'chevron-forward'}
          size={14}
          color="#475569"
        />
      </View>
    </TouchableOpacity>
  );
}

export default function ArticlesScreen() {
  const { user } = useAuthStore();
  const { data: articlesData, isLoading, isError, refetch } = useArticles();

  const isPro = user?.plan === 'PRO';
  const articles = articlesData?.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Artigos e Guias</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : isError ? (
        <EmptyState
          icon="wifi-outline"
          title="Erro ao carregar"
          description="Não foi possível carregar os artigos. Tente novamente."
          action={
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !isPro && articles.some((a) => (a as Article & { isProOnly?: boolean }).isProOnly) ? (
              <TouchableOpacity
                style={styles.paywallCard}
                onPress={() => router.push('/subscription')}
                activeOpacity={0.85}
              >
                <View style={styles.paywallLeft}>
                  <View style={styles.paywallIconContainer}>
                    <Ionicons name="star" size={20} color="#a78bfa" />
                  </View>
                  <View style={styles.paywallTextContainer}>
                    <Text style={styles.paywallTitle}>Conteúdo exclusivo para assinantes Pro</Text>
                    <Text style={styles.paywallDesc}>
                      Acesse guias completos, tutoriais avançados e conteúdo exclusivo
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.paywallButton}
                  onPress={() => router.push('/subscription')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.paywallButtonText}>Assinar Pro</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="book-outline"
              title="Nenhum artigo disponível"
              description="Ainda não há artigos publicados. Volte em breve!"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <ArticleCard article={item} isPro={isPro} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#141C2F',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141C2F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#253349',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  paywallCard: {
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#4338ca',
  },
  paywallLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  paywallIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2e1065',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  paywallTextContainer: {
    flex: 1,
  },
  paywallTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  paywallDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  paywallButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  paywallButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  separator: {
    height: 10,
  },
  card: {
    backgroundColor: '#141C2F',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#253349',
  },
  cardLocked: {
    opacity: 0.75,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#2e1065',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a78bfa',
  },
  lockIcon: {
    marginLeft: 'auto',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    lineHeight: 24,
    marginBottom: 6,
  },
  cardTitleLocked: {
    color: '#94a3b8',
  },
  cardExcerpt: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDate: {
    fontSize: 12,
    color: '#475569',
  },
  retryButton: {
    backgroundColor: '#818CF8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
