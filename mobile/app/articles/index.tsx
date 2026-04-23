import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useArticles } from '../../src/hooks/useArticles';
import { useAuthStore } from '../../src/store/auth.store';
import type { Article } from '../../src/types';
import {
  AuroraBackground,
  GlassCard,
  PressableScale,
  StaggerItem,
  SkeletonCard,
  EmptyStateIllustrated,
  aurora,
  premium,
  semantic,
  surface,
  text as textTokens,
  space,
  gradients,
  motion,
  haptics,
} from '../../src/components/primitives';

const CATEGORY_META: Record<
  string,
  { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  Guias: { color: aurora.cyan, icon: 'book' },
  Dicas: { color: semantic.success, icon: 'bulb' },
  Notícias: { color: premium.goldLight, icon: 'newspaper' },
  Tutoriais: { color: aurora.iris, icon: 'school' },
  Avaliações: { color: aurora.magenta, icon: 'star' },
};

const getCategoryMeta = (cat: string) =>
  CATEGORY_META[cat] ?? { color: textTokens.muted, icon: 'document-text' as const };

function getExcerpt(body: string, len = 120): string {
  const clean = body
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  return clean.length > len ? clean.slice(0, len) + '…' : clean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function calcReadingTime(body: string): number {
  const words = body.split(/\s+/).length;
  return Math.max(1, Math.round(words / 220)); // ~220 wpm
}

/**
 * Articles v2 — Apple News-style feed.
 *
 * Signature: hero top story (card grande full-width) + category filter pills
 * + standard cards abaixo.
 */
export default function ArticlesScreen() {
  const { user } = useAuthStore();
  const { data: articlesData, isLoading, isError, refetch } = useArticles();
  const [filter, setFilter] = useState<string | null>(null);

  const isPro = user?.plan === 'PRO';
  const allArticles: Article[] = articlesData?.data ?? [];

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    allArticles.forEach((a) => set.add(a.category));
    return Array.from(set);
  }, [allArticles]);

  // Filtered + sorted
  const articles = useMemo(() => {
    let list = [...allArticles];
    if (filter) list = list.filter((a) => a.category === filter);
    return list.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }, [allArticles, filter]);

  const topStory = articles[0];
  const rest = articles.slice(1);

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Artigos</Text>
            <Text style={styles.subtitle}>Guias, dicas, notícias</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 14 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : isError ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0} glow="danger">
              <EmptyStateIllustrated
                variant="radar"
                title="Erro ao carregar"
                description="Não foi possível carregar os artigos."
                ctaLabel="Tentar novamente"
                onCtaPress={() => refetch()}
              />
            </GlassCard>
          </View>
        ) : articles.length === 0 ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="search"
                title="Nenhum artigo ainda"
                description="Estamos preparando conteúdo. Volte em breve."
              />
            </GlassCard>
          </View>
        ) : (
          <FlatList
            data={rest}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                {/* Paywall banner */}
                {!isPro &&
                  allArticles.some(
                    (a) => (a as Article & { isProOnly?: boolean }).isProOnly,
                  ) && (
                    <Animated.View
                      entering={FadeIn.duration(motion.timing.medium)}
                      style={{ marginBottom: space.md }}
                    >
                      <PressableScale
                        onPress={() => {
                          haptics.tap();
                          router.push('/subscription');
                        }}
                        haptic="none"
                      >
                        <View style={styles.paywallBanner}>
                          <LinearGradient
                            colors={gradients.premium as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                          />
                          <LinearGradient
                            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.35)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                          <View style={styles.paywallContent}>
                            <Ionicons name="star" size={16} color={textTokens.onGold} />
                            <Text style={styles.paywallText}>
                              Libere artigos PRO com análises profundas
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color={textTokens.onGold}
                            />
                          </View>
                        </View>
                      </PressableScale>
                    </Animated.View>
                  )}

                {/* Category filter */}
                {categories.length > 1 && (
                  <Animated.View
                    entering={FadeInDown.duration(motion.timing.medium)}
                  >
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: space.md }}
                      contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
                    >
                      <CategoryChip
                        label="Todos"
                        active={filter === null}
                        onPress={() => setFilter(null)}
                      />
                      {categories.map((cat) => (
                        <CategoryChip
                          key={cat}
                          label={cat}
                          icon={getCategoryMeta(cat).icon}
                          color={getCategoryMeta(cat).color}
                          active={filter === cat}
                          onPress={() => setFilter(cat)}
                        />
                      ))}
                    </ScrollView>
                  </Animated.View>
                )}

                {/* Top story hero */}
                {topStory && (
                  <Animated.View
                    entering={FadeInDown.duration(motion.timing.medium)
                      .springify()
                      .damping(22)}
                  >
                    <TopStoryCard article={topStory} isPro={isPro} />
                  </Animated.View>
                )}

                {rest.length > 0 && (
                  <View style={{ marginTop: space.lg }}>
                    <Text style={styles.sectionLabel}>MAIS RECENTES</Text>
                  </View>
                )}
              </View>
            }
            renderItem={({ item, index }) => (
              <StaggerItem index={index} baseDelay={100}>
                <StandardArticleCard article={item} isPro={isPro} />
              </StaggerItem>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── CategoryChip ──────────────────────────────────────────────────────

function CategoryChip({
  label,
  icon,
  color,
  active,
  onPress,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={() => {
        haptics.select();
        onPress();
      }}
      haptic="none"
    >
      <View style={[chipStyles.chip, active && chipStyles.chipActive]}>
        {active && (
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
          />
        )}
        {icon && (
          <Ionicons
            name={icon}
            size={12}
            color={active ? '#041220' : color ?? textTokens.secondary}
          />
        )}
        <Text style={[chipStyles.text, active && chipStyles.textActive]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

// ─── TopStoryCard (hero da feed — Apple News big card) ─────────────────

function TopStoryCard({ article, isPro }: { article: Article; isPro: boolean }) {
  const isProOnly = (article as Article & { isProOnly?: boolean }).isProOnly;
  const isLocked = isProOnly && !isPro;
  const meta = getCategoryMeta(article.category);
  const excerpt = getExcerpt(article.body, 160);
  const readingTime = calcReadingTime(article.body);

  const handlePress = () => {
    haptics.tap();
    if (isLocked) router.push('/subscription');
    else router.push(`/articles/${article.slug}` as any);
  };

  return (
    <PressableScale onPress={handlePress} haptic="none" pressedScale={0.98}>
      <View style={topStyles.card}>
        {/* BG gradient — aurora pra featured */}
        <LinearGradient
          colors={
            isLocked
              ? (['#1C1C1E', '#2C2C2E', '#3A3A3C'] as [string, string, string])
              : (gradients.aurora as any)
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.62)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={topStyles.content}>
          {/* Featured tag */}
          <View style={topStyles.topRow}>
            <View style={topStyles.featuredBadge}>
              <Ionicons name="star" size={10} color="#FFF" />
              <Text style={topStyles.featuredText}>EM DESTAQUE</Text>
            </View>
            {isProOnly && (
              <View style={[topStyles.proBadge, isLocked && topStyles.proBadgeLocked]}>
                <Ionicons
                  name={isLocked ? 'lock-closed' : 'star'}
                  size={10}
                  color={textTokens.onGold}
                />
                <Text style={topStyles.proText}>PRO</Text>
              </View>
            )}
          </View>

          {/* Category */}
          <View style={topStyles.categoryChip}>
            <Ionicons name={meta.icon} size={11} color="#FFF" />
            <Text style={topStyles.categoryText}>{article.category}</Text>
          </View>

          {/* Title */}
          <Text style={topStyles.title} numberOfLines={3}>
            {article.title}
          </Text>

          {/* Excerpt */}
          {!isLocked && (
            <Text style={topStyles.excerpt} numberOfLines={3}>
              {excerpt}
            </Text>
          )}

          {/* Meta row */}
          <View style={topStyles.metaRow}>
            <View style={topStyles.metaItem}>
              <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={topStyles.metaText}>{formatDate(article.publishedAt)}</Text>
            </View>
            <View style={topStyles.metaDot} />
            <View style={topStyles.metaItem}>
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={topStyles.metaText}>{readingTime} min</Text>
            </View>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

// ─── StandardArticleCard ───────────────────────────────────────────────

function StandardArticleCard({ article, isPro }: { article: Article; isPro: boolean }) {
  const isProOnly = (article as Article & { isProOnly?: boolean }).isProOnly;
  const isLocked = isProOnly && !isPro;
  const meta = getCategoryMeta(article.category);
  const excerpt = getExcerpt(article.body, 110);
  const readingTime = calcReadingTime(article.body);

  const handlePress = () => {
    haptics.tap();
    if (isLocked) router.push('/subscription');
    else router.push(`/articles/${article.slug}` as any);
  };

  return (
    <PressableScale onPress={handlePress} haptic="none" pressedScale={0.97}>
      <GlassCard
        radiusSize="lg"
        padding={14}
        style={[isLocked && { opacity: 0.68 }]}
      >
        <View style={standardStyles.card}>
          {/* Left: category icon tile */}
          <View
            style={[
              standardStyles.iconTile,
              {
                backgroundColor: `${meta.color}1F`,
                borderColor: `${meta.color}55`,
              },
            ]}
          >
            <Ionicons name={meta.icon} size={22} color={meta.color} />
          </View>

          <View style={{ flex: 1 }}>
            {/* Category + date row */}
            <View style={standardStyles.topRow}>
              <Text style={[standardStyles.category, { color: meta.color }]}>
                {article.category.toUpperCase()}
              </Text>
              <Text style={standardStyles.date}>{formatDate(article.publishedAt)}</Text>
              {isProOnly && (
                <View style={standardStyles.proTag}>
                  <Ionicons
                    name={isLocked ? 'lock-closed' : 'star'}
                    size={8}
                    color={premium.goldLight}
                  />
                  <Text style={standardStyles.proText}>PRO</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text
              style={[standardStyles.title, isLocked && { color: textTokens.muted }]}
              numberOfLines={2}
            >
              {article.title}
            </Text>

            {/* Excerpt */}
            {!isLocked && (
              <Text style={standardStyles.excerpt} numberOfLines={2}>
                {excerpt}
              </Text>
            )}

            {/* Reading time */}
            <View style={standardStyles.footer}>
              <View style={standardStyles.timeRow}>
                <Ionicons name="time-outline" size={10} color={textTokens.dim} />
                <Text style={standardStyles.timeText}>{readingTime} min leitura</Text>
              </View>
              <Ionicons
                name={isLocked ? 'lock-closed-outline' : 'arrow-forward'}
                size={13}
                color={textTokens.muted}
              />
            </View>
          </View>
        </View>
      </GlassCard>
    </PressableScale>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  chipActive: {
    borderColor: 'transparent',
  },
  text: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  textActive: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
  },
});

const topStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 14,
  },
  content: {
    padding: space.xl,
    zIndex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  featuredText: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: premium.goldLight,
  },
  proBadgeLocked: {
    backgroundColor: `${premium.goldLight}CC`,
  },
  proText: {
    color: textTokens.onGold,
    fontFamily: 'Inter_900Black',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  categoryText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    marginTop: 12,
  },
  excerpt: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});

const standardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  category: {
    fontFamily: 'Inter_900Black',
    fontSize: 9,
    letterSpacing: 1,
  },
  date: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: premium.goldSoft,
    borderWidth: 1,
    borderColor: `${premium.gold}55`,
    marginLeft: 'auto',
  },
  proText: {
    color: premium.goldLight,
    fontFamily: 'Inter_900Black',
    fontSize: 8,
    letterSpacing: 0.4,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.1,
    marginTop: 2,
  },
  excerpt: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: textTokens.dim,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 8,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: surface.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  titleBox: {
    flex: 1,
    marginLeft: 4,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 1,
  },

  listContent: {
    padding: space.md,
    paddingBottom: 120,
  },

  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  paywallBanner: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: premium.goldLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  paywallContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    zIndex: 1,
  },
  paywallText: {
    flex: 1,
    color: textTokens.onGold,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.1,
  },
});
