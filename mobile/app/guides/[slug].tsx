import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useGuideBySlug, useToggleUpvote } from '../../src/hooks/useGuides';
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

/**
 * Guide reader v2 — community-authored long-form.
 *
 * Signature: hero aurora header + upvote button com heart-fill animation
 * bouncy + typography hierarchy pra markdown.
 */
export default function GuideDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading } = useGuideBySlug(String(params.slug));
  const upvote = useToggleUpvote();
  const upvotedByMe = data?.upvotedByMe;
  const heartScale = useSharedValue(1);

  React.useEffect(() => {
    heartScale.value = 1;
  }, [heartScale]);

  const handleUpvote = () => {
    if (!data) return;
    haptics.medium();
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 10, stiffness: 320 }),
      withSpring(1, { damping: 18, stiffness: 260 }),
    );
    upvote.mutate(data.id);
  };

  const handleShare = async () => {
    if (!data) return;
    haptics.tap();
    try {
      await Share.share({
        message: `${data.title}\n\n${data.summary}\n\nLer completo: https://milhasextras.com.br/guides/${data.slug}`,
      });
    } catch {
      /* cancelou */
    }
  };

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

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

  if (!data) {
    return (
      <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={{ padding: space.md, marginTop: space.xl }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="search"
                title="Guia não encontrado"
                description="Este guia pode ter sido removido."
                ctaLabel="Voltar"
                onCtaPress={() => router.back()}
              />
            </GlassCard>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={{ flex: 1 }} />
          <PressableScale onPress={handleShare} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="share-outline" size={18} color={textTokens.primary} />
          </PressableScale>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Animated.View
            entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
          >
            <View style={styles.heroCard}>
              <LinearGradient
                colors={gradients.aurora as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[StyleSheet.absoluteFill, { height: '45%' }]}
              />

              <View style={styles.heroContent}>
                <View style={styles.heroBadge}>
                  <Ionicons name="book" size={10} color="#FFF" />
                  <Text style={styles.heroBadgeText}>GUIA DA COMUNIDADE</Text>
                </View>

                <Text style={styles.heroTitle}>{data.title}</Text>
                <Text style={styles.heroSummary}>{data.summary}</Text>

                <View style={styles.heroMeta}>
                  <View style={styles.heroMetaItem}>
                    <View style={styles.heroAvatar}>
                      <Text style={styles.heroAvatarText}>
                        {data.authorName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.heroAuthor}>{data.authorName}</Text>
                  </View>
                  <View style={styles.heroMetaDot} />
                  <Text style={styles.heroDate}>
                    {new Date(data.publishedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Stats + upvote */}
          <Animated.View
            entering={FadeIn.delay(150).duration(motion.timing.medium)}
            style={styles.actionsRow}
          >
            <PressableScale
              onPress={handleUpvote}
              haptic="none"
              style={[
                styles.upvoteBtn,
                upvotedByMe && styles.upvoteBtnActive,
              ]}
              disabled={upvote.isPending}
            >
              {upvotedByMe && (
                <LinearGradient
                  colors={['#FF6961', semantic.danger]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                />
              )}
              <Animated.View style={heartStyle}>
                <Ionicons
                  name={upvotedByMe ? 'heart' : 'heart-outline'}
                  size={18}
                  color={upvotedByMe ? '#FFF' : semantic.danger}
                />
              </Animated.View>
              <Text
                style={[
                  styles.upvoteText,
                  upvotedByMe && styles.upvoteTextActive,
                ]}
              >
                {data.upvoteCount}
              </Text>
            </PressableScale>

            <View style={styles.viewsChip}>
              <Ionicons name="eye-outline" size={13} color={textTokens.muted} />
              <Text style={styles.viewsText}>{data.viewCount} leituras</Text>
            </View>
          </Animated.View>

          {/* Body */}
          <Animated.View
            entering={FadeIn.delay(200).duration(motion.timing.medium)}
            style={{ marginTop: space.md }}
          >
            <GlassCard radiusSize="lg" padding={18}>
              <Text style={styles.body}>{data.body}</Text>
            </GlassCard>
          </Animated.View>

          {/* Footer CTA */}
          <Animated.View
            entering={FadeIn.delay(350).duration(motion.timing.medium)}
            style={{ marginTop: space.md }}
          >
            <PressableScale onPress={handleShare} haptic="tap">
              <GlassCard radiusSize="lg" padding={14} glow="cyan">
                <View style={styles.shareRow}>
                  <View style={styles.shareIcon}>
                    <Ionicons name="share-social" size={18} color={aurora.cyan} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shareTitle}>Compartilhar guia</Text>
                    <Text style={styles.shareText}>Ajude mais gente da comunidade</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={textTokens.muted} />
                </View>
              </GlassCard>
            </PressableScale>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

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
  content: {
    padding: space.md,
    paddingBottom: 120,
  },

  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.48,
    shadowRadius: 26,
    elevation: 14,
  },
  heroContent: {
    padding: space.xl,
    zIndex: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 14,
  },
  heroBadgeText: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 10,
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  heroSummary: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarText: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 10,
  },
  heroAuthor: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  heroMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  heroDate: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: space.md,
  },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: semantic.dangerBg,
    borderWidth: 1,
    borderColor: `${semantic.danger}44`,
    overflow: 'hidden',
  },
  upvoteBtnActive: {
    borderColor: 'transparent',
    shadowColor: semantic.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  upvoteText: {
    color: semantic.danger,
    fontFamily: 'Inter_900Black',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  upvoteTextActive: {
    color: '#FFF',
  },
  viewsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  viewsText: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },

  body: {
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.1,
  },

  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareIcon: {
    width: 38,
    height: 38,
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
    fontSize: 13,
  },
  shareText: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
});
