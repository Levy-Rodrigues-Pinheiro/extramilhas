import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Share,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useArticle } from '../../src/hooks/useArticles';
import {
  AuroraBackground,
  GlassCard,
  PressableScale,
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

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function calcReadingTime(body: string): number {
  const words = body.split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

type BodyPart =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'paragraph'; segments: { text: string; bold?: boolean; italic?: boolean }[] };

function parseMarkdown(body: string): BodyPart[] {
  const parts: BodyPart[] = [];
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 0);

  for (const block of paragraphs) {
    const trimmed = block.trim();

    if (trimmed.startsWith('# ')) {
      parts.push({ type: 'h1', text: trimmed.replace(/^# /, '') });
      continue;
    }
    if (trimmed.startsWith('## ')) {
      parts.push({ type: 'h2', text: trimmed.replace(/^## /, '') });
      continue;
    }
    if (trimmed.startsWith('### ')) {
      parts.push({ type: 'h3', text: trimmed.replace(/^### /, '') });
      continue;
    }
    if (trimmed.startsWith('> ')) {
      parts.push({
        type: 'quote',
        text: trimmed.replace(/^>\s?/gm, '').trim(),
      });
      continue;
    }

    const lines = trimmed.split('\n');
    const listLines = lines.filter((l) => l.startsWith('- ') || l.startsWith('* '));
    if (listLines.length > 0 && listLines.length === lines.length) {
      parts.push({
        type: 'list',
        items: listLines.map((l) => l.replace(/^[-*] /, '')),
      });
      continue;
    }

    const raw = trimmed;
    const segments: { text: string; bold?: boolean; italic?: boolean }[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: raw.slice(lastIndex, match.index) });
      }
      const full = match[0];
      if (full.startsWith('**') && full.endsWith('**')) {
        segments.push({ text: full.slice(2, -2), bold: true });
      } else if (full.startsWith('*') && full.endsWith('*')) {
        segments.push({ text: full.slice(1, -1), italic: true });
      }
      lastIndex = match.index + full.length;
    }
    if (lastIndex < raw.length) {
      segments.push({ text: raw.slice(lastIndex) });
    }

    parts.push({ type: 'paragraph', segments });
  }

  return parts;
}

const HERO_HEIGHT = 320;

/**
 * Article reader v2 — Apple News-style.
 *
 * Signature: hero parallax no topo (gradient da categoria) que colapsa
 * conforme scroll + reading progress bar no topo + typography hierarchy
 * tipo Apple News (Charter-inspired serif headlines).
 */
export default function ArticleReaderScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: article, isLoading, isError } = useArticle(slug!);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const handleShare = async () => {
    if (!article) return;
    haptics.tap();
    try {
      await Share.share({
        message: `${article.title}\n\nhttps://milhasextras.com.br/artigos/${article.slug}`,
      });
    } catch {
      /* cancel */
    }
  };

  if (isLoading) {
    return (
      <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={{ padding: space.md, gap: 14 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  if (isError || !article) {
    return (
      <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.errorBox}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="search"
                title="Artigo não encontrado"
                description="Este artigo pode ter sido removido ou o link está quebrado."
                ctaLabel="Voltar"
                onCtaPress={() => router.back()}
              />
            </GlassCard>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  const meta = getCategoryMeta(article.category);
  const body = parseMarkdown(article.body);
  const readingTime = calcReadingTime(article.body);

  return (
    <View style={{ flex: 1, backgroundColor: '#050810' }}>
      {/* Reading progress bar top */}
      <ReadingProgressBar scrollY={scrollY} bodyLength={article.body.length} />

      {/* Floating top controls */}
      <FloatingTopBar scrollY={scrollY} title={article.title} onShare={handleShare} />

      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero parallax */}
        <HeroSection
          article={article}
          meta={meta}
          readingTime={readingTime}
          scrollY={scrollY}
        />

        {/* Article body */}
        <View style={styles.body}>
          {body.map((part, i) => (
            <Animated.View
              key={i}
              entering={FadeIn.duration(motion.timing.short).delay(i < 10 ? i * 40 : 0)}
            >
              <BodyPart part={part} />
            </Animated.View>
          ))}

          {/* Footer */}
          <View style={styles.articleFooter}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerMeta}>
              {meta.icon && (
                <>
                  <Ionicons name={meta.icon} size={11} color={meta.color} />
                  {'  '}
                </>
              )}
              {article.category.toUpperCase()} · {formatDate(article.publishedAt)}
            </Text>

            <View style={{ height: space.lg }} />

            <PressableScale onPress={handleShare} haptic="tap">
              <GlassCard radiusSize="lg" padding={14} glow="cyan">
                <View style={styles.shareRow}>
                  <View style={styles.shareIcon}>
                    <Ionicons name="share-social" size={18} color={aurora.cyan} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareTitle}>Compartilhar artigo</Text>
                    <Text style={styles.shareText}>
                      Envie pra um amigo que curte milhas
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={textTokens.muted} />
                </View>
              </GlassCard>
            </PressableScale>
          </View>
        </View>
      </AnimatedScrollView>
    </View>
  );
}

// ─── ReadingProgressBar (topo, sticky) ─────────────────────────────────

function ReadingProgressBar({
  scrollY,
  bodyLength,
}: {
  scrollY: Animated.SharedValue<number>;
  bodyLength: number;
}) {
  // Estimar altura total (rough): 2000px por 5000 chars
  const estimatedContentHeight = Math.max(1000, (bodyLength / 5000) * 2200);

  const style = useAnimatedStyle(() => {
    const progress = Math.min(
      1,
      Math.max(0, (scrollY.value - HERO_HEIGHT / 2) / estimatedContentHeight),
    );
    return {
      width: `${progress * 100}%`,
    };
  });

  return (
    <View style={progStyles.track} pointerEvents="none">
      <Animated.View style={[progStyles.fill, style]}>
        <LinearGradient
          colors={gradients.auroraCyanMagenta}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ─── FloatingTopBar (back + share) ─────────────────────────────────────

function FloatingTopBar({
  scrollY,
  title,
  onShare,
}: {
  scrollY: Animated.SharedValue<number>;
  title: string;
  onShare: () => void;
}) {
  const bgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [HERO_HEIGHT * 0.5, HERO_HEIGHT * 0.8],
      [0, 0.95],
      Extrapolation.CLAMP,
    ),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [HERO_HEIGHT * 0.7, HERO_HEIGHT],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [HERO_HEIGHT * 0.7, HERO_HEIGHT],
          [6, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={topBarStyles.wrap}>
      {/* BG que aparece */}
      <Animated.View style={[topBarStyles.bg, bgStyle]} pointerEvents="none" />

      <SafeAreaView edges={['top']} style={{ zIndex: 1 }}>
        <View style={topBarStyles.row}>
          <PressableScale
            onPress={() => router.back()}
            haptic="tap"
            style={topBarStyles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </PressableScale>

          <Animated.View style={[topBarStyles.titleWrap, titleStyle]}>
            <Text style={topBarStyles.title} numberOfLines={1}>
              {title}
            </Text>
          </Animated.View>

          <PressableScale onPress={onShare} haptic="tap" style={topBarStyles.iconBtn}>
            <Ionicons name="share-outline" size={20} color="#FFF" />
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── HeroSection (parallax) ────────────────────────────────────────────

function HeroSection({
  article,
  meta,
  readingTime,
  scrollY,
}: {
  article: any;
  meta: { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] };
  readingTime: number;
  scrollY: Animated.SharedValue<number>;
}) {
  // Parallax: imagem/gradient move mais devagar que scroll
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-HERO_HEIGHT, 0, HERO_HEIGHT],
          [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.5],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          scrollY.value,
          [-HERO_HEIGHT, 0],
          [1.4, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, HERO_HEIGHT * 0.6],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, HERO_HEIGHT],
          [0, -40],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={heroStyles.wrap}>
      {/* Background with parallax */}
      <Animated.View style={[heroStyles.bg, heroStyle]}>
        <LinearGradient
          colors={
            (article as any).isProOnly
              ? (gradients.premium as any)
              : (gradients.aurora as any)
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(5,8,16,0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Content */}
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Animated.View style={[heroStyles.content, contentStyle]}>
          {/* Category */}
          <Animated.View
            entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            style={heroStyles.categoryChip}
          >
            <Ionicons name={meta.icon} size={12} color="#FFF" />
            <Text style={heroStyles.categoryText}>{article.category.toUpperCase()}</Text>
          </Animated.View>

          {/* Title */}
          <Animated.Text
            entering={FadeInDown.delay(80).duration(motion.timing.medium)}
            style={heroStyles.title}
          >
            {article.title}
          </Animated.Text>

          {/* Subtitle / summary (if available) */}
          {(article as any).summary && (
            <Animated.Text
              entering={FadeInDown.delay(140).duration(motion.timing.medium)}
              style={heroStyles.subtitle}
            >
              {(article as any).summary}
            </Animated.Text>
          )}

          {/* Meta row */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(motion.timing.medium)}
            style={heroStyles.metaRow}
          >
            <View style={heroStyles.metaItem}>
              <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={heroStyles.metaText}>{formatDate(article.publishedAt)}</Text>
            </View>
            <View style={heroStyles.metaDot} />
            <View style={heroStyles.metaItem}>
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={heroStyles.metaText}>{readingTime} min leitura</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── BodyPart renderer ─────────────────────────────────────────────────

function BodyPart({ part }: { part: BodyPart }) {
  switch (part.type) {
    case 'h1':
      return <Text style={bodyStyles.h1}>{part.text}</Text>;
    case 'h2':
      return <Text style={bodyStyles.h2}>{part.text}</Text>;
    case 'h3':
      return <Text style={bodyStyles.h3}>{part.text}</Text>;
    case 'list':
      return (
        <View style={bodyStyles.list}>
          {part.items.map((item, i) => (
            <View key={i} style={bodyStyles.listItem}>
              <View style={bodyStyles.bullet} />
              <Text style={bodyStyles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'quote':
      return (
        <View style={bodyStyles.quote}>
          <View style={bodyStyles.quoteBar} />
          <Text style={bodyStyles.quoteText}>{part.text}</Text>
        </View>
      );
    case 'paragraph':
      return (
        <Text style={bodyStyles.paragraph}>
          {part.segments.map((seg, i) => (
            <Text
              key={i}
              style={[
                seg.bold && bodyStyles.bold,
                seg.italic && bodyStyles.italic,
              ]}
            >
              {seg.text}
            </Text>
          ))}
        </Text>
      );
    default:
      return null;
  }
}

// ─── Styles ─────────────────────────────────────────────────────────────

const progStyles = StyleSheet.create({
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  fill: {
    height: 3,
    overflow: 'hidden',
  },
});

const topBarStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 8, 16, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: surface.separator,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 8,
    gap: 8,
    minHeight: 44,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
});

const heroStyles = StyleSheet.create({
  wrap: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: space.xl,
    paddingBottom: space.xxl,
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  categoryText: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 10,
    letterSpacing: 1,
  },
  title: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});

const bodyStyles = StyleSheet.create({
  h1: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    marginTop: 24,
    marginBottom: 8,
  },
  h2: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    marginTop: 22,
    marginBottom: 6,
  },
  h3: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    marginTop: 18,
    marginBottom: 4,
  },
  paragraph: {
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.1,
    marginVertical: 10,
  },
  bold: {
    fontFamily: 'Inter_700Bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  list: {
    marginVertical: 10,
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingRight: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: aurora.cyan,
    marginTop: 10,
  },
  listText: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 26,
  },
  quote: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}44`,
  },
  quoteBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: aurora.cyan,
  },
  quoteText: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
});

const styles = StyleSheet.create({
  errorBox: {
    padding: space.md,
    marginTop: space.xl,
  },
  body: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: 80,
    backgroundColor: '#050810',
  },
  articleFooter: {
    marginTop: space.xl,
  },
  footerDivider: {
    height: 1,
    backgroundColor: surface.separator,
    marginBottom: space.md,
  },
  footerMeta: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}44`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  shareText: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
});
