import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Share,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTransferBonuses, TransferOpportunity } from '../src/hooks/useArbitrage';
import { PaywallUpsellBanner, LockedOpportunityCard } from '../src/components/PaywallGate';
import { FirstRunTip } from '../src/components/FirstRunTip';
import { ReviewCompact } from '../src/components/ReviewCompact';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  StaggerItem,
  ShimmerSkeleton,
  SkeletonCard,
  EmptyStateIllustrated,
  aurora,
  premium,
  semantic,
  system,
  surface,
  text as textTokens,
  space,
  gradients,
  motion,
  haptics,
} from '../src/components/primitives';

type SortMode = 'best' | 'newest' | 'expiring';
type FilterMode = 'all' | 'my_programs' | 'top_only';

/**
 * Arbitrage v2 — core feature de monetização.
 *
 * Wow moments:
 *  - IMPERDÍVEL cards: glow gold + shimmer sweep diagonal no badge
 *  - Gain % pulse proporcional ao ganho (>100% = pulse visível)
 *  - Stagger entrance nas cards
 *  - Filtros com selected state aurora
 */
export default function ArbitrageScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch, error } = useTransferBonuses();

  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('best');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const visible = useMemo(() => {
    if (!data?.opportunities) return [];
    let list = [...data.opportunities];

    if (filterMode === 'my_programs') {
      list = list.filter((o) => (o.userSourceBalance ?? 0) > 0);
    } else if (filterMode === 'top_only') {
      list = list.filter((o) => o.classification === 'IMPERDIVEL');
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.fromProgram.name.toLowerCase().includes(q) ||
          o.toProgram.name.toLowerCase().includes(q),
      );
    }

    if (sortMode === 'best') {
      list.sort((a, b) => b.gainPercent - a.gainPercent);
    } else if (sortMode === 'expiring') {
      list.sort((a, b) => {
        const ax = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        const bx = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
        return ax - bx;
      });
    }

    return list;
  }, [data, search, sortMode, filterMode]);

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>{t('home.quick_opportunities')}</Text>
            <Text style={styles.subtitle}>
              {data?.isPersonalized
                ? t('arbitrage.best_for_your_balance')
                : t('arbitrage.subtitle')}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                haptics.medium();
                refetch();
              }}
              tintColor={aurora.cyan}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading && (
            <View style={{ gap: 14 }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          )}

          {error && (
            <GlassCard glow="danger" radiusSize="lg" padding={20} style={styles.errorBox}>
              <Ionicons name="alert-circle" size={30} color={semantic.danger} />
              <Text style={styles.errorText}>{t('errors.generic')}</Text>
              <AuroraButton
                label={t('common.try_again')}
                onPress={() => refetch()}
                variant="apple"
                size="md"
                icon="refresh"
                iconPosition="left"
              />
            </GlassCard>
          )}

          {!isLoading && data && data.count === 0 && (
            <View style={{ marginTop: space.md }}>
              <GlassCard radiusSize="xl" padding={0}>
                <EmptyStateIllustrated
                  variant="radar"
                  title={t('home.no_bonuses')}
                  description={t('home.no_bonuses_notice')}
                  ctaLabel="Configurar alerta"
                  onCtaPress={() => router.push('/alerts/create' as any)}
                />
              </GlassCard>
              <PressableScale
                onPress={() => router.push('/bonus-history' as any)}
                haptic="tap"
                style={{ alignItems: 'center', marginTop: 12 }}
              >
                <Text style={styles.linkText}>Ver bônus recentes (últimos 30d) →</Text>
              </PressableScale>
            </View>
          )}

          <FirstRunTip
            tipKey="arbitrage-how-v1"
            title="Primeira vez vendo oportunidades?"
            body="Cada card é uma janela de bônus de transferência. Se o ganho % for alto E você tiver saldo no programa origem, VALE transferir."
            icon="help-circle-outline"
          />

          {data && data.count > 0 && (
            <>
              {/* Info banner */}
              <Animated.View
                entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
              >
                <GlassCard radiusSize="md" padding={12} style={styles.infoBanner}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="bulb" size={14} color={aurora.cyan} />
                  </View>
                  <Text style={styles.infoText}>
                    <Text style={styles.infoBold}>Como funciona:</Text> transferir com bônus
                    diminui o custo por milha. Quanto maior o ganho %, melhor.
                  </Text>
                </GlassCard>
              </Animated.View>

              {/* Search + filters */}
              <Animated.View
                entering={FadeInDown.delay(80).duration(motion.timing.medium)}
                style={filters.box}
              >
                <GlassCard radiusSize="md" padding={12} style={filters.searchRow}>
                  <Ionicons name="search" size={15} color={textTokens.muted} />
                  <TextInput
                    style={filters.searchInput}
                    placeholder={t('common.search')}
                    placeholderTextColor={textTokens.muted}
                    value={search}
                    onChangeText={setSearch}
                    accessibilityLabel={t('common.search')}
                    selectionColor={aurora.cyan}
                  />
                  {search.length > 0 && (
                    <PressableScale onPress={() => setSearch('')} haptic="tap" hitSlop={8}>
                      <Ionicons name="close-circle" size={17} color={textTokens.muted} />
                    </PressableScale>
                  )}
                </GlassCard>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={filters.chipsRow}
                >
                  {(
                    [
                      { key: 'all', label: t('arbitrage.filter_all') },
                      { key: 'my_programs', label: t('arbitrage.filter_my_programs') },
                      { key: 'top_only', label: t('arbitrage.filter_top_only') },
                    ] as Array<{ key: FilterMode; label: string }>
                  ).map((f) => (
                    <FilterChip
                      key={f.key}
                      label={f.label}
                      active={filterMode === f.key}
                      onPress={() => setFilterMode(f.key)}
                    />
                  ))}
                  <View style={filters.divider} />
                  {(
                    [
                      { key: 'best', label: t('arbitrage.sort_best'), icon: 'trending-up' },
                      { key: 'newest', label: t('arbitrage.sort_newest'), icon: 'calendar-outline' },
                      { key: 'expiring', label: t('arbitrage.sort_expiring'), icon: 'time-outline' },
                    ] as Array<{ key: SortMode; label: string; icon: any }>
                  ).map((s) => (
                    <FilterChip
                      key={s.key}
                      label={s.label}
                      icon={s.icon}
                      active={sortMode === s.key}
                      onPress={() => setSortMode(s.key)}
                    />
                  ))}
                </ScrollView>
              </Animated.View>

              {visible.length === 0 && (
                <GlassCard radiusSize="lg" padding={24} style={{ alignItems: 'center' }}>
                  <Text style={styles.emptyFilterText}>
                    {search
                      ? `Nenhuma oportunidade com "${search}"`
                      : 'Nenhuma oportunidade com esses filtros'}
                  </Text>
                </GlassCard>
              )}

              {visible.map((op, i) => (
                <StaggerItem key={op.id} index={i} baseDelay={160}>
                  <OpportunityCard opportunity={op} />
                </StaggerItem>
              ))}

              {data.shouldUpsell && data.lockedCount && data.lockedCount > 0 ? (
                <>
                  <PaywallUpsellBanner lockedCount={data.lockedCount} />
                  {Array.from({ length: Math.min(2, data.lockedCount) }).map((_, i) => (
                    <LockedOpportunityCard key={`locked-${i}`} index={i} />
                  ))}
                </>
              ) : null}
            </>
          )}

          {/* History link */}
          <PressableScale
            onPress={() => router.push('/bonus-history' as any)}
            haptic="tap"
            style={{ marginTop: space.md }}
          >
            <GlassCard radiusSize="md" padding={14} style={historyLink.box}>
              <View style={historyLink.iconWrap}>
                <Ionicons name="time-outline" size={16} color={aurora.cyan} />
              </View>
              <Text style={historyLink.text}>Ver histórico dos últimos 90 dias</Text>
              <Ionicons name="chevron-forward" size={16} color={textTokens.muted} />
            </GlassCard>
          </PressableScale>

          {/* Report CTA */}
          <PressableScale
            onPress={() => router.push('/report-bonus' as any)}
            haptic="tap"
            style={{ marginTop: space.sm }}
          >
            <GlassCard radiusSize="md" padding={14} glow="cyan" style={cta.box}>
              <View style={cta.iconBox}>
                <Ionicons name="megaphone" size={18} color={aurora.cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={cta.title}>{t('arbitrage.report_cta_title')}</Text>
                <Text style={cta.text}>{t('arbitrage.report_cta_text')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={textTokens.muted} />
            </GlassCard>
          </PressableScale>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── FilterChip ─────────────────────────────────────────────────────────

function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: any;
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
      <View style={[filters.chip, active && filters.chipActive]}>
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
            size={11}
            color={active ? '#041220' : textTokens.muted}
          />
        )}
        <Text style={[filters.chipText, active && filters.chipTextActive]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

// ─── OpportunityCard ────────────────────────────────────────────────────

function OpportunityCard({ opportunity: o }: { opportunity: TransferOpportunity }) {
  const { t } = useTranslation();

  const isImperdivel = o.classification === 'IMPERDIVEL';
  const isGood = o.classification === 'BOA';
  const color = isImperdivel ? premium.goldLight : isGood ? semantic.success : textTokens.muted;

  const label = isImperdivel
    ? t('arbitrage.classification_imperdivel')
    : isGood
    ? t('arbitrage.classification_boa')
    : t('arbitrage.classification_normal');

  const daysLeft =
    o.expiresAt != null
      ? Math.max(0, Math.ceil((new Date(o.expiresAt).getTime() - Date.now()) / 86_400_000))
      : null;

  // Pulse proporcional ao gain. >50% = pulsar, >100% = pulsar forte.
  const gainIntensity = Math.min(1, o.gainPercent / 100);
  const glowPulse = useSharedValue(0);

  React.useEffect(() => {
    if (gainIntensity < 0.4) return;
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [gainIntensity, glowPulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.3, 0.75]),
  }));

  // Shimmer diagonal sweep nos IMPERDIVEL
  const shimmerX = useSharedValue(0);
  React.useEffect(() => {
    if (!isImperdivel) return;
    shimmerX.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.linear }),
      -1,
      false,
    );
  }, [isImperdivel, shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerX.value, [0, 1], [-120, 260]) },
    ],
  }));

  return (
    <GlassCard
      radiusSize="lg"
      padding={16}
      glow={isImperdivel ? 'gold' : isGood ? 'success' : 'none'}
      style={{ marginBottom: space.sm, position: 'relative', overflow: 'hidden' }}
    >
      {/* Glow pulse layer */}
      {gainIntensity >= 0.4 && (
        <Animated.View
          style={[
            cardStyles.glowLayer,
            glowStyle,
            { backgroundColor: `${color}14` },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Header: badge + days */}
      <View style={cardStyles.header}>
        <View
          style={[
            cardStyles.badge,
            { borderColor: color, backgroundColor: `${color}1F` },
          ]}
        >
          {isImperdivel && (
            <Animated.View
              style={[cardStyles.shimmer, shimmerStyle]}
              pointerEvents="none"
            />
          )}
          <Text style={[cardStyles.badgeText, { color }]}>{label}</Text>
        </View>
        {daysLeft !== null && (
          <View style={cardStyles.daysChip}>
            <Ionicons name="time-outline" size={11} color={textTokens.muted} />
            <Text style={cardStyles.daysText}>
              {daysLeft > 0
                ? t('wallet.expires_in_days', { days: daysLeft })
                : t('wallet.expiring_soon')}
            </Text>
          </View>
        )}
      </View>

      {/* Transfer row */}
      <View style={cardStyles.transferRow}>
        <View style={cardStyles.programBox}>
          <Text style={cardStyles.programLabel}>DE</Text>
          <Text style={cardStyles.programName}>{o.fromProgram.name}</Text>
          <Text style={cardStyles.programCpm}>
            CPM R$ {o.fromProgram.avgCpm.toFixed(2)}
          </Text>
        </View>

        <View style={cardStyles.arrowBox}>
          <Ionicons name="arrow-forward" size={22} color={aurora.cyan} />
          <View style={[cardStyles.bonusTag, { backgroundColor: `${color}22` }]}>
            <Text style={[cardStyles.bonusText, { color }]}>
              +{o.currentBonus.toFixed(0)}%
            </Text>
          </View>
        </View>

        <View style={[cardStyles.programBox, { alignItems: 'flex-end' }]}>
          <Text style={cardStyles.programLabel}>PARA</Text>
          <Text style={cardStyles.programName}>{o.toProgram.name}</Text>
          <Text style={cardStyles.programCpm}>
            CPM R$ {o.toProgram.avgCpm.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Metrics row */}
      <View style={cardStyles.metricsRow}>
        <View style={cardStyles.metric}>
          <Text style={cardStyles.metricLabel}>CPM efetivo</Text>
          <Text style={[cardStyles.metricValue, { color }]}>
            R$ {o.effectiveCpm.toFixed(2)}
          </Text>
        </View>
        <View style={cardStyles.metric}>
          <Text style={cardStyles.metricLabel}>Ganho</Text>
          <AnimatedNumber
            value={o.gainPercent}
            format="decimal"
            decimals={1}
            suffix="%"
            style={[cardStyles.metricValue, { color }]}
          />
        </View>
        <View style={cardStyles.metric}>
          <Text style={cardStyles.metricLabel}>+/1000mi</Text>
          <Text style={cardStyles.metricValue}>
            R$ {o.valueGainPer1000.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Personal box */}
      {o.userSourceBalance != null && o.userSourceBalance > 0 && (
        <View style={cardStyles.personalBox}>
          <View style={cardStyles.personalHeader}>
            <View style={cardStyles.personalDot}>
              <Ionicons name="wallet" size={11} color={semantic.success} />
            </View>
            <Text style={cardStyles.personalTitle}>Pra você</Text>
          </View>
          <Text style={cardStyles.personalText}>
            Seu saldo de{' '}
            <Text style={cardStyles.personalBold}>
              {o.userSourceBalance.toLocaleString('pt-BR')}
            </Text>{' '}
            pts {o.fromProgram.name} vira{' '}
            <Text style={cardStyles.personalBold}>
              {o.potentialResultingMiles?.toLocaleString('pt-BR')}
            </Text>{' '}
            mi {o.toProgram.name} — extra capturado:{' '}
            <Text style={[cardStyles.personalBold, { color: semantic.success }]}>
              R$ {o.potentialValueGain?.toFixed(2)}
            </Text>
          </Text>
        </View>
      )}

      {/* CTAs */}
      <View style={cardStyles.ctaRow}>
        <View style={{ flex: 1 }}>
          <AuroraButton
            label={`Transferir · ${o.fromProgram.name}`}
            onPress={() => openTransferFlow(o)}
            variant="primary"
            size="md"
            icon="open-outline"
            iconPosition="left"
            fullWidth
            haptic="medium"
          />
        </View>
        <PressableScale
          onPress={() => shareOpportunity(o)}
          haptic="tap"
          style={cardStyles.shareBtn}
        >
          <Ionicons name="share-social-outline" size={18} color="#25D366" />
        </PressableScale>
      </View>

      <ReviewCompact partnershipId={o.id} />
    </GlassCard>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

const PROGRAM_URLS: Record<string, string> = {
  livelo: 'https://www.livelo.com.br/transfira-seus-pontos',
  esfera: 'https://www.esferasantanderbanespa.com.br/',
  itau: 'https://www.itau.com.br/cartoes/programa-sempre-presente',
  bradesco: 'https://www.bradesco.com.br/',
  sicredi: 'https://www.sicredi.com.br/',
};

async function openTransferFlow(o: TransferOpportunity) {
  haptics.medium();
  const url = PROGRAM_URLS[o.fromProgram.slug];
  if (url) {
    await Linking.openURL(url).catch(() => {});
    return;
  }
  const q = encodeURIComponent(`${o.fromProgram.name} transferir pontos ${o.toProgram.name}`);
  await Linking.openURL(`https://www.google.com/search?q=${q}`).catch(() => {});
}

async function shareOpportunity(o: TransferOpportunity) {
  haptics.tap();
  const bonus = Math.round(o.currentBonus);
  const gain = o.gainPercent.toFixed(1);
  const message =
    `🎁 Bônus ativo: ${bonus}% ${o.fromProgram.name} → ${o.toProgram.name}\n\n` +
    `Ganho real de ${gain}% no valor das milhas. Descobri no Milhas Extras:\n\n` +
    `https://milhasextras.com.br`;
  try {
    await Share.share({ message });
  } catch {
    /* cancelled */
  }
}

// ─── Styles ─────────────────────────────────────────────────────────────

const filters = StyleSheet.create({
  box: {
    marginTop: space.xs,
    marginBottom: space.md,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  chipsRow: {
    gap: 6,
    paddingHorizontal: 2,
  },
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
  chipText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: surface.separator,
    marginHorizontal: 4,
    alignSelf: 'center',
  },
});

const cardStyles = StyleSheet.create({
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ skewX: '-20deg' }],
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  daysChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  daysText: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  programBox: {
    flex: 1,
  },
  programLabel: {
    color: textTokens.dim,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  programName: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  programCpm: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  arrowBox: {
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
  },
  bonusTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bonusText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: textTokens.dim,
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  personalBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  personalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  personalDot: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: semantic.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalTitle: {
    color: semantic.success,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  personalText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  personalBold: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    alignItems: 'center',
  },
  shareBtn: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.45)',
  },
});

const historyLink = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});

const cta = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  text: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
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
    marginLeft: 8,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 1,
  },
  content: {
    padding: space.md,
    paddingBottom: 120,
  },

  errorBox: {
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    textAlign: 'center',
  },

  linkText: {
    color: aurora.cyan,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: space.md,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  infoBold: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
  },

  emptyFilterText: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
