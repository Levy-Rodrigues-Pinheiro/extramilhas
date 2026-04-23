import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useWallet, useUpsertBalance, useDeleteBalance, WalletItem } from '../src/hooks/useWallet';
import { usePrograms } from '../src/hooks/usePrograms';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  ShimmerSkeleton,
  SkeletonCard,
  StaggerItem,
  EmptyStateIllustrated,
  FloatingLabelInput,
  aurora,
  premium,
  semantic,
  surface,
  text as textTokens,
  space,
  gradients,
  motion,
  haptics,
} from '../src/components/primitives';

/**
 * Wallet v2 — Aurora.
 *
 * Hierarquia:
 *  1. Header com back + title + add button
 *  2. Hero aurora gradient + AnimatedNumber no valor BRL
 *  3. Expiry warning (glow warning) se aplicável
 *  4. Lista de programas com stagger entrance + glass cards
 *  5. Bottom sheet modal (aurora bg + floating inputs + AuroraButton)
 */
export default function WalletScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch, error } = useWallet();
  const { data: programs } = usePrograms();
  const upsert = useUpsertBalance();
  const remove = useDeleteBalance();

  const [editing, setEditing] = useState<WalletItem | null>(null);
  const [adding, setAdding] = useState(false);

  const handleSave = async (programId: string, balance: number, expiresAt?: string) => {
    try {
      await upsert.mutateAsync({ programId, balance, expiresAt });
      haptics.success();
      setEditing(null);
      setAdding(false);
    } catch (e: any) {
      haptics.error();
      Alert.alert(t('common.error'), e?.message || t('errors.generic'));
    }
  };

  const handleDelete = (item: WalletItem) => {
    haptics.warning();
    Alert.alert(
      'Remover saldo?',
      `Você quer remover ${item.program.name} da sua carteira?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove.mutateAsync(item.programId);
              haptics.heavy();
            } catch (e: any) {
              Alert.alert('Erro', e?.message || 'Falha ao remover');
            }
          },
        },
      ],
    );
  };

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>{t('wallet.title')}</Text>
            <Text style={styles.subtitle}>Seu patrimônio em milhas</Text>
          </View>
          <PressableScale
            onPress={() => setAdding(true)}
            haptic="medium"
            style={styles.addBtn}
          >
            <LinearGradient
              colors={gradients.auroraCyanMagenta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="add" size={22} color="#041220" />
          </PressableScale>
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
          {isLoading && !data && (
            <View style={{ gap: 14 }}>
              <ShimmerSkeleton height={150} radius="xl" />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          )}

          {error && (
            <GlassCard glow="danger" radiusSize="lg" style={styles.errorBox}>
              <Ionicons name="alert-circle" size={28} color={semantic.danger} />
              <Text style={styles.errorText}>{t('errors.generic')}</Text>
            </GlassCard>
          )}

          {data && (
            <>
              {/* ─── Hero ─────────────────────── */}
              <Animated.View
                entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
              >
                <View style={styles.hero}>
                  <LinearGradient
                    colors={gradients.aurora}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                  />
                  <LinearGradient
                    colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFill, { height: '45%', borderRadius: 24 }]}
                  />

                  <View style={styles.heroContent}>
                    <Text style={styles.heroLabel}>{t('wallet.total_value')}</Text>
                    <AnimatedNumber
                      value={data.summary.totalValueBrl}
                      format="currency"
                      style={styles.heroValue}
                    />
                    <View style={styles.heroMetaRow}>
                      <View style={styles.heroMetaItem}>
                        <Ionicons name="wallet" size={14} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.heroMeta}>
                          {data.summary.totalBalance.toLocaleString('pt-BR')} pts
                        </Text>
                      </View>
                      <View style={styles.heroMetaDivider} />
                      <View style={styles.heroMetaItem}>
                        <Ionicons name="business" size={14} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.heroMeta}>
                          {data.summary.programsCount} programa
                          {data.summary.programsCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Animated.View>

              {/* ─── Expiry warning ─────────────── */}
              {data.summary.expiringCount > 0 && (
                <Animated.View
                  entering={FadeIn.delay(100).duration(motion.timing.medium)}
                  style={{ marginTop: space.md }}
                >
                  <GlassCard
                    glow="none"
                    radiusSize="md"
                    padding={14}
                    style={styles.warnBox}
                  >
                    <View style={styles.warnIcon}>
                      <Ionicons name="time" size={18} color={premium.goldLight} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.warnTitle}>
                        {data.summary.expiringCount} programa
                        {data.summary.expiringCount !== 1 ? 's' : ''} com pontos vencendo
                      </Text>
                      <Text style={styles.warnSub}>em 30 dias ou menos</Text>
                    </View>
                  </GlassCard>
                </Animated.View>
              )}

              {/* ─── Lista de programas ─────────── */}
              {data.items.length === 0 ? (
                <View style={{ marginTop: space.xl }}>
                  <GlassCard radiusSize="xl" padding={0} style={{ overflow: 'hidden' }}>
                    <EmptyStateIllustrated
                      variant="wallet"
                      title={t('wallet.no_balances_title')}
                      description={t('wallet.no_balances_subtitle')}
                      ctaLabel={t('wallet.add_program')}
                      onCtaPress={() => setAdding(true)}
                    />
                  </GlassCard>
                </View>
              ) : (
                <View style={{ marginTop: space.md, gap: 10 }}>
                  <Text style={styles.sectionLabel}>Meus saldos</Text>
                  {data.items.map((item, i) => (
                    <StaggerItem key={item.id} index={i} baseDelay={180}>
                      <BalanceCard
                        item={item}
                        onEdit={() => setEditing(item)}
                        onDelete={() => handleDelete(item)}
                      />
                    </StaggerItem>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {(adding || editing) && (
          <BalanceModal
            item={editing}
            allPrograms={programs || []}
            existingProgramIds={data?.items.map((i) => i.programId) || []}
            onSave={handleSave}
            onClose={() => {
              setEditing(null);
              setAdding(false);
            }}
            loading={upsert.isPending}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── BalanceCard ────────────────────────────────────────────────────────

function BalanceCard({
  item,
  onEdit,
  onDelete,
}: {
  item: WalletItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <GlassCard
      radiusSize="lg"
      padding={16}
      glow={item.isExpiringSoon ? 'gold' : 'none'}
    >
      <View style={cardStyles.header}>
        <Text style={cardStyles.program}>{item.program.name}</Text>
        {item.isExpiringSoon && (
          <View style={cardStyles.expiryBadge}>
            <Ionicons name="time" size={11} color={premium.goldLight} />
            <Text style={cardStyles.expiryText}>{item.daysToExpiry}d</Text>
          </View>
        )}
      </View>

      <View style={cardStyles.balanceRow}>
        <AnimatedNumber
          value={item.balance}
          format="integer"
          style={cardStyles.balance}
        />
        <Text style={cardStyles.unit}>pontos</Text>
      </View>

      <View style={cardStyles.valueRow}>
        <View style={cardStyles.greenDot}>
          <Ionicons name="trending-up" size={11} color={semantic.success} />
        </View>
        <Text style={cardStyles.value}>
          ≈ R$ {item.valueBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={cardStyles.cpm}>· CPM R$ {item.program.avgCpm.toFixed(2)}</Text>
      </View>

      <View style={cardStyles.actions}>
        <PressableScale onPress={onEdit} haptic="tap" style={cardStyles.actionBtn}>
          <Ionicons name="pencil" size={13} color={aurora.cyan} />
          <Text style={cardStyles.actionText}>{t('common.edit')}</Text>
        </PressableScale>
        <View style={cardStyles.actionDivider} />
        <PressableScale onPress={onDelete} haptic="tap" style={cardStyles.actionBtn}>
          <Ionicons name="trash-outline" size={13} color={semantic.danger} />
          <Text style={[cardStyles.actionText, { color: semantic.danger }]}>
            {t('common.remove')}
          </Text>
        </PressableScale>
      </View>
    </GlassCard>
  );
}

// ─── BalanceModal (bottom sheet) ────────────────────────────────────────

function BalanceModal({
  item,
  allPrograms,
  existingProgramIds,
  onSave,
  onClose,
  loading,
}: {
  item: WalletItem | null;
  allPrograms: Array<{ id: string; name: string; slug: string }>;
  existingProgramIds: string[];
  onSave: (programId: string, balance: number, expiresAt?: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [programId, setProgramId] = useState(item?.programId || '');
  const [balance, setBalance] = useState(item?.balance.toString() || '');
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt?.substring(0, 10) || '');

  const availablePrograms = item
    ? allPrograms
    : allPrograms.filter((p) => !existingProgramIds.includes(p.id));

  const canSave = programId && balance && parseInt(balance, 10) > 0;

  return (
    <Modal visible animationType="none" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Animated.View
              entering={SlideInDown.duration(motion.timing.base).springify().damping(28).stiffness(180)}
              exiting={SlideOutDown.duration(motion.timing.base)}
              style={styles.modalCard}
            >
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {item ? t('wallet.edit_balance') : t('wallet.add_program')}
                </Text>
                <PressableScale onPress={onClose} haptic="tap" style={styles.modalClose}>
                  <Ionicons name="close" size={20} color={textTokens.secondary} />
                </PressableScale>
              </View>

              {!item && (
                <>
                  <Text style={styles.modalLabel}>Programa</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: space.md }}
                  >
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {availablePrograms.map((p) => {
                        const selected = programId === p.id;
                        return (
                          <PressableScale
                            key={p.id}
                            onPress={() => {
                              haptics.select();
                              setProgramId(p.id);
                            }}
                            haptic="none"
                          >
                            <View
                              style={[
                                styles.programChip,
                                selected && styles.programChipSelected,
                              ]}
                            >
                              {selected && (
                                <LinearGradient
                                  colors={gradients.auroraCyanMagenta}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 0 }}
                                  style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
                                />
                              )}
                              <Text
                                style={[
                                  styles.programChipText,
                                  selected && styles.programChipTextSelected,
                                ]}
                              >
                                {p.name}
                              </Text>
                            </View>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </ScrollView>
                </>
              )}

              {item && (
                <GlassCard radiusSize="md" padding={12} style={{ marginBottom: space.md }}>
                  <Text style={styles.modalProgramText}>{item.program.name}</Text>
                </GlassCard>
              )}

              <FloatingLabelInput
                label={t('wallet.total_miles')}
                iconLeft="wallet-outline"
                value={balance}
                onChangeText={(v) => setBalance(v.replace(/\D/g, ''))}
                keyboardType="numeric"
                maxLength={9}
              />

              <FloatingLabelInput
                label="Vencimento (aaaa-mm-dd) — opcional"
                iconLeft="calendar-outline"
                value={expiresAt}
                onChangeText={setExpiresAt}
                maxLength={10}
              />

              <View style={{ height: 8 }} />

              <AuroraButton
                label={item ? t('common.save') : t('common.add')}
                onPress={() => onSave(programId, parseInt(balance, 10), expiresAt || undefined)}
                disabled={!canSave || loading}
                loading={loading}
                variant="primary"
                size="lg"
                icon="checkmark"
                fullWidth
                haptic="medium"
              />
            </Animated.View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  program: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: premium.goldSoft,
    borderColor: `${premium.gold}55`,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  expiryText: {
    color: premium.goldLight,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 10,
  },
  balance: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 24,
    letterSpacing: -0.4,
  },
  unit: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  greenDot: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: semantic.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: semantic.success,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  cpm: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginLeft: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: space.sm,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 4,
  },
  actionText: {
    color: aurora.cyan,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  actionDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: surface.glassBorder,
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
    gap: 10,
    padding: 20,
  },
  errorText: {
    color: semantic.danger,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },

  hero: {
    borderRadius: 24,
    padding: space.xl,
    overflow: 'hidden',
    minHeight: 170,
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  heroContent: {
    zIndex: 1,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroValue: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.6,
    marginTop: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.95)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  heroMetaDivider: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderColor: `${premium.gold}50`,
  },
  warnIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: premium.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  warnSub: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },

  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 24, 0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0A1020',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: space.xl,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: surface.glassBorder,
  },
  modalHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: space.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  modalTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: surface.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLabel: {
    color: textTokens.muted,
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modalProgramText: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  programChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  programChipSelected: {
    borderColor: 'transparent',
  },
  programChipText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  programChipTextSelected: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
  },
});
