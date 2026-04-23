import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/auth.store';
import { useProfile, useUpdateBalances } from '../../src/hooks/useProfile';
import { usePrograms } from '../../src/hooks/usePrograms';
import { PlanBadge } from '../../src/components/PlanBadge';
import { MilesInput } from '../../src/components/MilesInput';
import { OnboardingTour } from '../../src/components/OnboardingTour';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  StaggerItem,
  ShimmerSkeleton,
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
} from '../../src/components/primitives';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  accent?: 'aurora' | 'gold' | 'success' | 'none';
  badge?: string;
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const updateBalances = useUpdateBalances();

  const [balances, setBalances] = useState<Record<string, number>>({});
  const [balancesInitialized, setBalancesInitialized] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const profile = profileData?.user ?? user;
  const milesBalances = profileData?.milesBalances ?? [];

  if (!balancesInitialized && milesBalances.length > 0) {
    const initial: Record<string, number> = {};
    milesBalances.forEach((b) => {
      initial[b.programId] = b.balance;
    });
    setBalances(initial);
    setBalancesInitialized(true);
  }

  const plan = profile?.plan ?? 'FREE';
  const name = profile?.name ?? 'Usuário';
  const email = profile?.email ?? '';
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSaveBalances = async () => {
    const balancePayload = Object.entries(balances).map(([programId, balance]) => ({
      programId,
      balance,
    }));
    try {
      haptics.medium();
      await updateBalances.mutateAsync({ balances: balancePayload });
      haptics.success();
      Alert.alert(t('common.success'), t('wallet.balance_updated'));
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  const handleLogout = () => {
    haptics.warning();
    Alert.alert(t('auth.logout'), t('profile.logout_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => {
          haptics.heavy();
          logout();
        },
      },
    ]);
  };

  // Menu agrupado por função (grupos visualmente separados)
  const groups: Array<{ title: string; items: MenuItem[] }> = [
    {
      title: 'Arbitragem',
      items: [
        {
          icon: 'trending-up',
          label: 'Oportunidades de arbitragem',
          accent: 'aurora',
          onPress: () => router.push('/arbitrage' as any),
        },
        {
          icon: 'trophy',
          label: 'Ranking de Reporters',
          accent: 'gold',
          onPress: () => router.push('/leaderboard' as any),
        },
        {
          icon: 'megaphone',
          label: 'Reportar um bônus',
          onPress: () => router.push('/report-bonus' as any),
        },
        {
          icon: 'swap-horizontal',
          label: 'Transferências',
          onPress: () => router.push('/transfers'),
        },
      ],
    },
    {
      title: 'Meu progresso',
      items: [
        {
          icon: 'flag',
          label: 'Minhas metas',
          onPress: () => router.push('/goals' as any),
        },
        {
          icon: 'star',
          label: 'Missões',
          accent: 'gold',
          onPress: () => router.push('/missions' as any),
        },
        {
          icon: 'stats-chart',
          label: 'Dashboard + histórico',
          onPress: () => router.push('/dashboard' as any),
        },
        {
          icon: 'analytics',
          label: 'Análise da carteira + sinais',
          onPress: () => router.push('/portfolio-analysis' as any),
        },
        {
          icon: 'sparkles',
          label: 'Minha semana (Wrapped)',
          accent: 'aurora',
          onPress: () => router.push('/retrospective' as any),
        },
      ],
    },
    {
      title: 'Comunidade',
      items: [
        {
          icon: 'people',
          label: 'Família',
          onPress: () => router.push('/family'),
        },
        {
          icon: 'gift',
          label: 'Indique e ganhe Premium',
          accent: 'gold',
          onPress: () => router.push('/referral' as any),
        },
        {
          icon: 'chatbubbles',
          label: 'Fórum da comunidade',
          onPress: () => router.push('/forum' as any),
        },
        {
          icon: 'book',
          label: 'Guias da comunidade',
          onPress: () => router.push('/guides' as any),
        },
      ],
    },
    {
      title: 'Ferramentas',
      items: [
        {
          icon: 'card',
          label: 'Qual cartão vale mais pra mim?',
          onPress: () => router.push('/card-recommender' as any),
        },
        {
          icon: 'git-compare',
          label: 'Comparar cartões lado a lado',
          onPress: () => router.push('/card-compare' as any),
        },
        {
          icon: 'document-text',
          label: 'Recuperar milhas não creditadas',
          onPress: () => router.push('/claims-wizard' as any),
        },
        {
          icon: 'airplane',
          label: 'Indenização de voo (ANAC/EU261)',
          onPress: () => router.push('/compensation-eu261' as any),
        },
        {
          icon: 'receipt',
          label: 'Relatório pro IR',
          onPress: () => router.push('/tax-report' as any),
        },
      ],
    },
    {
      title: 'Notificações',
      items: [
        {
          icon: 'mail',
          label: 'Caixa de notificações',
          onPress: () => router.push('/notifications-feed' as any),
        },
        {
          icon: 'notifications',
          label: 'Preferências de notificação',
          onPress: () => router.push('/notification-settings' as any),
        },
      ],
    },
    {
      title: 'Conta',
      items: [
        {
          icon: 'create',
          label: 'Editar perfil',
          onPress: () => router.push('/edit-profile' as any),
        },
        {
          icon: 'shield-checkmark',
          label: t('profile.security'),
          onPress: () => router.push('/security' as any),
        },
        {
          icon: 'settings',
          label: 'Preferências',
          onPress: () => router.push('/preferences' as any),
        },
        {
          icon: 'options',
          label: 'Configurações (tema, acessibilidade)',
          onPress: () => router.push('/settings' as any),
        },
        {
          icon: 'document-text',
          label: 'Minhas notas',
          onPress: () => router.push('/notes' as any),
        },
      ],
    },
    {
      title: 'Ajuda',
      items: [
        {
          icon: 'help-circle',
          label: 'Ver tour guiado',
          onPress: () => setTourOpen(true),
        },
        {
          icon: 'help-buoy',
          label: 'Suporte / central de ajuda',
          onPress: () => router.push('/support' as any),
        },
        {
          icon: 'book',
          label: 'Artigos e Guias',
          onPress: () => router.push('/articles'),
        },
        {
          icon: 'shield',
          label: 'Política de Privacidade',
          onPress: () =>
            Linking.openURL('https://milhasextras.com.br/privacidade').catch(() => {}),
        },
      ],
    },
  ];

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {tourOpen && <OnboardingTour force onFinish={() => setTourOpen(false)} />}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Top — Avatar + user info ────────────── */}
          <Animated.View
            entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            style={styles.topSection}
          >
            <View style={styles.avatarWrap}>
              <View style={styles.avatarHalo} />
              <LinearGradient
                colors={gradients.aurora}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            </View>

            {profileLoading ? (
              <View style={{ marginTop: 12, gap: 6, alignItems: 'center' }}>
                <ShimmerSkeleton width={120} height={20} radius="sm" />
                <ShimmerSkeleton width={160} height={12} radius="xs" />
              </View>
            ) : (
              <>
                <Text style={styles.userName}>{name}</Text>
                <Text style={styles.userEmail}>{email}</Text>
                <View style={styles.planBadgeContainer}>
                  <PlanBadge plan={plan} />
                </View>
              </>
            )}
          </Animated.View>

          {/* ─── Upgrade banner (FREE only) ──────────── */}
          {plan === 'FREE' && (
            <Animated.View
              entering={FadeIn.delay(80).duration(motion.timing.medium)}
              style={{ paddingHorizontal: space.md }}
            >
              <PressableScale
                onPress={() => {
                  haptics.medium();
                  router.push('/subscription');
                }}
                haptic="none"
              >
                <View style={styles.upgradeBanner}>
                  <LinearGradient
                    colors={gradients.premium}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.35)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFill, { height: '50%' }]}
                  />

                  <View style={styles.upgradeContent}>
                    <View style={styles.upgradeIconBox}>
                      <Ionicons name="rocket" size={22} color={textTokens.onGold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.upgradeTitle}>{t('profile.upgrade_cta')}</Text>
                      <Text style={styles.upgradeDesc}>{t('paywall.upgrade_pitch')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={textTokens.onGold} />
                  </View>
                </View>
              </PressableScale>
            </Animated.View>
          )}

          {/* ─── Miles balance ────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('wallet.total_miles')}</Text>

            {programsLoading ? (
              <View style={{ gap: 10 }}>
                <ShimmerSkeleton height={48} radius="md" />
                <ShimmerSkeleton height={48} radius="md" />
              </View>
            ) : (
              <>
                <GlassCard radiusSize="lg" padding={10}>
                  {programs?.map((p, i) => (
                    <View
                      key={p.id}
                      style={[
                        i > 0 && {
                          borderTopWidth: 1,
                          borderTopColor: surface.glassBorder,
                          marginTop: 4,
                          paddingTop: 4,
                        },
                      ]}
                    >
                      <MilesInput
                        programId={p.id}
                        programName={p.name}
                        programSlug={p.slug}
                        balance={balances[p.id] ?? 0}
                        onChange={(value) =>
                          setBalances((prev) => ({ ...prev, [p.id]: value }))
                        }
                      />
                    </View>
                  ))}
                </GlassCard>

                <View style={{ height: 12 }} />

                <AuroraButton
                  label={t('common.save')}
                  onPress={handleSaveBalances}
                  loading={updateBalances.isPending}
                  variant="primary"
                  size="md"
                  icon="cloud-upload"
                  iconPosition="left"
                  fullWidth
                  haptic="medium"
                />
              </>
            )}
          </View>

          {/* ─── Menu groups ────────────────────── */}
          {groups.map((group, gi) => (
            <View key={group.title} style={styles.section}>
              <Text style={styles.sectionLabel}>{group.title}</Text>
              <GlassCard radiusSize="lg" padding={0}>
                {group.items.map((item, i) => (
                  <StaggerItem
                    key={item.label}
                    index={i}
                    baseDelay={gi * 60 + 100}
                  >
                    <MenuRow
                      item={item}
                      isLast={i === group.items.length - 1}
                    />
                  </StaggerItem>
                ))}
              </GlassCard>
            </View>
          ))}

          {/* ─── Logout ─────────────────────────── */}
          <View style={{ paddingHorizontal: space.md, marginTop: space.md }}>
            <PressableScale onPress={handleLogout} haptic="none" style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={18} color={semantic.danger} />
              <Text style={styles.logoutText}>{t('auth.logout')}</Text>
            </PressableScale>
          </View>

          <Text style={styles.versionText}>
            Milhas Extras v1.0.1 · build {new Date().getFullYear()}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── MenuRow ──────────────────────────────────────────────────────────

function MenuRow({ item, isLast }: { item: MenuItem; isLast: boolean }) {
  const accentColors = {
    aurora: aurora.cyan,
    gold: premium.goldLight,
    success: semantic.success,
    none: textTokens.secondary,
  };
  const accentBg = {
    aurora: aurora.cyanSoft,
    gold: premium.goldSoft,
    success: semantic.successBg,
    none: surface.glass,
  };
  const accent = item.accent ?? 'none';
  const iconColor = accentColors[accent];
  const bgColor = accentBg[accent];

  return (
    <>
      <PressableScale
        onPress={item.onPress}
        haptic="tap"
        style={styles.menuRow}
      >
        <View style={[styles.menuIcon, { backgroundColor: bgColor }]}>
          <Ionicons name={item.icon} size={16} color={iconColor} />
        </View>
        <Text style={styles.menuLabel}>{item.label}</Text>
        {item.badge && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{item.badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={15} color={textTokens.dim} />
      </PressableScale>
      {!isLast && <View style={styles.menuDivider} />}
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
  },
  topSection: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: space.md,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarHalo: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: aurora.magentaSoft,
    top: -10,
    left: -10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Inter_900Black',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  userName: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  userEmail: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 3,
  },
  planBadgeContainer: {
    marginTop: 10,
  },

  upgradeBanner: {
    minHeight: 68,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: space.md,
    shadowColor: premium.goldLight,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    gap: 12,
    zIndex: 1,
  },
  upgradeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeTitle: {
    color: textTokens.onGold,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  upgradeDesc: {
    color: 'rgba(30,18,2,0.72)',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 2,
  },

  section: {
    paddingHorizontal: space.md,
    marginTop: space.xl,
  },
  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  menuBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}55`,
  },
  menuBadgeText: {
    color: aurora.cyan,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  menuDivider: {
    height: 1,
    marginLeft: 56,
    backgroundColor: surface.separator,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: semantic.dangerBg,
    borderWidth: 1,
    borderColor: `${semantic.danger}44`,
  },
  logoutText: {
    color: semantic.danger,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },

  versionText: {
    color: textTokens.dim,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textAlign: 'center',
    marginTop: space.xl,
    marginBottom: space.md,
  },
});
