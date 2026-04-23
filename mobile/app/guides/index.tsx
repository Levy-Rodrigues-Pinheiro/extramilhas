import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useGuides, GuideSummary } from '../../src/hooks/useGuides';
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

/**
 * Guides v2 — community-authored feed.
 *
 * Card design: numbered guide tile com upvote + views + author prominente.
 * CTA Write novo guia com gradient aurora.
 */
export default function GuidesListScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = useGuides();

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Guias da comunidade</Text>
            <Text style={styles.subtitle}>Escritos por quem vive milhas</Text>
          </View>
          <PressableScale
            onPress={() => {
              haptics.medium();
              router.push('/guides/new' as any);
            }}
            haptic="none"
            style={styles.addBtn}
          >
            <LinearGradient
              colors={gradients.auroraCyanMagenta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="create" size={20} color="#041220" />
          </PressableScale>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : !data?.items || data.items.length === 0 ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="search"
                title="Nenhum guia ainda"
                description="Seja o primeiro a compartilhar sua estratégia. Seu guia ajuda todo mundo da comunidade."
                ctaLabel="Escrever primeiro guia"
                onCtaPress={() => router.push('/guides/new' as any)}
              />
            </GlassCard>
          </View>
        ) : (
          <FlatList
            data={data.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <StaggerItem index={index} baseDelay={100}>
                <GuideCard guide={item} index={index + 1} />
              </StaggerItem>
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListHeaderComponent={
              <Animated.View
                entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
              >
                <GlassCard radiusSize="lg" padding={14} glow="cyan" style={{ marginBottom: space.md }}>
                  <View style={styles.introRow}>
                    <View style={styles.introIcon}>
                      <Ionicons name="book" size={18} color={aurora.cyan} />
                    </View>
                    <Text style={styles.introText}>
                      Guias escritos por outros usuários. Curta os que te ajudaram e compartilhe
                      sua experiência escrevendo o seu.
                    </Text>
                  </View>
                </GlassCard>
              </Animated.View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

function GuideCard({ guide, index }: { guide: GuideSummary; index: number }) {
  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        router.push(`/guides/${guide.slug}` as any);
      }}
      haptic="none"
    >
      <GlassCard radiusSize="lg" padding={16}>
        <View style={cardStyles.row}>
          {/* Numbered tile */}
          <View style={cardStyles.numTile}>
            <LinearGradient
              colors={gradients.auroraCyanMagenta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={cardStyles.numText}>
              {String(index).padStart(2, '0')}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={cardStyles.title} numberOfLines={2}>
              {guide.title}
            </Text>
            <Text style={cardStyles.summary} numberOfLines={2}>
              {guide.summary}
            </Text>

            <View style={cardStyles.footer}>
              <View style={cardStyles.authorRow}>
                <View style={cardStyles.avatarDot}>
                  <Text style={cardStyles.avatarText}>
                    {guide.authorName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={cardStyles.author}>{guide.authorName}</Text>
              </View>

              <View style={cardStyles.stats}>
                <View style={cardStyles.stat}>
                  <Ionicons name="heart" size={11} color={semantic.danger} />
                  <Text style={cardStyles.statText}>{guide.upvoteCount}</Text>
                </View>
                <View style={cardStyles.stat}>
                  <Ionicons name="eye-outline" size={11} color={textTokens.muted} />
                  <Text style={cardStyles.statText}>{guide.viewCount}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </GlassCard>
    </PressableScale>
  );
}

const cardStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  numTile: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  numText: {
    color: '#041220',
    fontFamily: 'Inter_900Black',
    fontSize: 16,
    letterSpacing: -0.4,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  summary: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  avatarDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: aurora.cyan,
    fontFamily: 'Inter_900Black',
    fontSize: 10,
  },
  author: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
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
    fontSize: 18,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 1,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  list: {
    padding: space.md,
    paddingBottom: 120,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  introIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${aurora.cyan}44`,
  },
  introText: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
});
