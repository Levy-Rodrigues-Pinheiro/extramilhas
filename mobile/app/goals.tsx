import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  SlideInDown,
  SlideOutDown,
  FadeInDown,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  useGoals,
  useCreateGoal,
  useDeleteGoal,
  UserGoal,
} from '../src/hooks/useEngagement';
import { usePrograms } from '../src/hooks/usePrograms';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  AnimatedNumber,
  StaggerItem,
  SkeletonCard,
  EmptyStateIllustrated,
  FloatingLabelInput,
  ActivityRings,
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

export default function GoalsScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = useGoals();
  const { data: programs } = usePrograms();
  const create = useCreateGoal();
  const del = useDeleteGoal();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [programId, setProgramId] = useState<string | undefined>();
  const [targetMiles, setTargetMiles] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleCreate = async () => {
    const miles = parseInt(targetMiles.replace(/\D/g, ''), 10);
    if (!title.trim() || !miles || miles < 1000 || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      haptics.error();
      Alert.alert('Dados inválidos', 'Preencha título, milhas alvo (min 1000) e data (aaaa-mm-dd).');
      return;
    }
    try {
      haptics.medium();
      await create.mutateAsync({ title: title.trim(), programId, targetMiles: miles, targetDate });
      haptics.success();
      setModalOpen(false);
      setTitle('');
      setProgramId(undefined);
      setTargetMiles('');
      setTargetDate('');
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('errors.generic'));
    }
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
            <Text style={styles.title}>Minhas metas</Text>
            <Text style={styles.subtitle}>Onde você quer chegar</Text>
          </View>
          <PressableScale
            onPress={() => {
              haptics.medium();
              setModalOpen(true);
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
            <Ionicons name="add" size={22} color="#041220" />
          </PressableScale>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 14 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : !data || data.length === 0 ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="compass"
                title="Nenhuma meta ainda"
                description="Defina uma meta tipo 'Europa em Dez' ou '200k Smiles' e acompanhe seu progresso em milhas."
                ctaLabel="Criar primeira meta"
                onCtaPress={() => setModalOpen(true)}
              />
            </GlassCard>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(g) => g.id}
            ListHeaderComponent={
              <GoalsRingsHero goals={data.filter((g) => !g.completedAt).slice(0, 3)} />
            }
            renderItem={({ item, index }) => {
              const programName = programs?.find((p: any) => p.id === item.programId)?.name;
              return (
                <StaggerItem index={index} baseDelay={100}>
                  <GoalCard
                    item={item}
                    programName={programName}
                    onDelete={() => {
                      Alert.alert('Excluir meta', `Remover "${item.title}"?`, [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.remove'),
                          style: 'destructive',
                          onPress: () => {
                            haptics.heavy();
                            del.mutate(item.id);
                          },
                        },
                      ]);
                    }}
                  />
                </StaggerItem>
              );
            }}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Modal: new goal */}
        {modalOpen && (
          <Modal visible animationType="none" transparent onRequestClose={() => setModalOpen(false)}>
            <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
              <Pressable>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                  <Animated.View
                    entering={SlideInDown.duration(motion.timing.base)
                      .springify()
                      .damping(28)
                      .stiffness(180)}
                    exiting={SlideOutDown.duration(motion.timing.base)}
                    style={styles.modalCard}
                  >
                    <View style={styles.modalHandle} />

                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Nova meta</Text>
                      <PressableScale
                        onPress={() => setModalOpen(false)}
                        haptic="tap"
                        style={styles.modalClose}
                      >
                        <Ionicons name="close" size={20} color={textTokens.secondary} />
                      </PressableScale>
                    </View>

                    <FloatingLabelInput
                      label="Título"
                      iconLeft="flag-outline"
                      value={title}
                      onChangeText={setTitle}
                    />

                    <Text style={styles.label}>Programa (opcional)</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: space.md }}
                    >
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <ProgramChip
                          label="Qualquer"
                          selected={!programId}
                          onPress={() => setProgramId(undefined)}
                        />
                        {(programs ?? []).map((p: any) => (
                          <ProgramChip
                            key={p.id}
                            label={p.name}
                            selected={programId === p.id}
                            onPress={() => setProgramId(p.id)}
                          />
                        ))}
                      </View>
                    </ScrollView>

                    <FloatingLabelInput
                      label="Milhas alvo"
                      iconLeft="locate-outline"
                      value={targetMiles}
                      onChangeText={(v) => setTargetMiles(v.replace(/\D/g, ''))}
                      keyboardType="numeric"
                    />

                    <FloatingLabelInput
                      label="Data alvo (aaaa-mm-dd)"
                      iconLeft="calendar-outline"
                      value={targetDate}
                      onChangeText={setTargetDate}
                      maxLength={10}
                    />

                    <View style={{ height: 8 }} />

                    <AuroraButton
                      label="Criar meta"
                      onPress={handleCreate}
                      loading={create.isPending}
                      variant="primary"
                      size="lg"
                      icon="checkmark"
                      iconPosition="left"
                      fullWidth
                      haptic="medium"
                    />
                  </Animated.View>
                </KeyboardAvoidingView>
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── GoalsRingsHero (Apple Watch Activity style) ──────────────────────

function GoalsRingsHero({ goals }: { goals: UserGoal[] }) {
  if (goals.length === 0) return null;

  const ringColors = [aurora.cyan, aurora.magenta, premium.goldLight];
  const rings = goals.slice(0, 3).map((g, i) => ({
    value: Math.min(1, g.percent / 100),
    color: ringColors[i],
    label: g.title.length > 18 ? g.title.slice(0, 16) + '…' : g.title,
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
    >
      <GlassCard radiusSize="xl" padding={20} style={{ marginBottom: space.md }}>
        <Text style={heroStyles.label}>SEU PROGRESSO</Text>
        <View style={heroStyles.row}>
          <ActivityRings rings={rings} size={180} strokeWidth={14} gap={6} showLabels={true} />
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ─── GoalCard ───────────────────────────────────────────────────────────

function GoalCard({
  item,
  programName,
  onDelete,
}: {
  item: UserGoal;
  programName?: string;
  onDelete: () => void;
}) {
  const completed = !!item.completedAt;
  const percent = Math.min(100, item.percent);

  return (
    <GlassCard
      radiusSize="lg"
      padding={16}
      glow={completed ? 'success' : percent >= 50 ? 'cyan' : 'none'}
    >
      <View style={cardStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={cardStyles.title}>{item.title}</Text>
          <View style={cardStyles.metaTop}>
            {programName && (
              <>
                <View style={cardStyles.progDot}>
                  <Ionicons name="card-outline" size={11} color={aurora.cyan} />
                </View>
                <Text style={cardStyles.metaText}>{programName}</Text>
                <View style={cardStyles.metaDot} />
              </>
            )}
            <Text style={cardStyles.metaText}>
              Meta: {item.targetMiles.toLocaleString('pt-BR')} mi
            </Text>
          </View>
        </View>

        {completed ? (
          <View style={cardStyles.completedBadge}>
            <Ionicons name="checkmark-circle" size={13} color={semantic.success} />
            <Text style={cardStyles.completedText}>Concluída</Text>
          </View>
        ) : (
          <PressableScale onPress={onDelete} haptic="none" hitSlop={8}>
            <Ionicons name="trash-outline" size={17} color={semantic.danger} />
          </PressableScale>
        )}
      </View>

      {/* Progress */}
      <View style={cardStyles.progressHeader}>
        <Text style={cardStyles.progressText}>
          {item.progressMiles.toLocaleString('pt-BR')} / {item.targetMiles.toLocaleString('pt-BR')}{' '}
          mi
        </Text>
        <AnimatedNumber
          value={percent}
          format="decimal"
          decimals={1}
          suffix="%"
          style={[
            cardStyles.progressPercent,
            { color: completed ? semantic.success : aurora.cyan },
          ]}
        />
      </View>
      <View style={cardStyles.progressTrack}>
        <LinearGradient
          colors={
            completed
              ? [semantic.success, '#66E88A']
              : (gradients.auroraCyanMagenta as any)
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[cardStyles.progressFill, { width: `${percent}%` }]}
        />
      </View>

      {/* Meta row */}
      <View style={cardStyles.metaRow}>
        <View style={cardStyles.metaBox}>
          <View style={cardStyles.metaIconWrap}>
            <Ionicons name="time-outline" size={11} color={aurora.cyan} />
          </View>
          <View>
            <Text style={cardStyles.metaLabel}>Prazo</Text>
            <Text style={cardStyles.metaValue}>{item.daysLeft}d</Text>
          </View>
        </View>
        <View style={cardStyles.metaBox}>
          <View style={cardStyles.metaIconWrap}>
            <Ionicons name="speedometer-outline" size={11} color={aurora.magenta} />
          </View>
          <View>
            <Text style={cardStyles.metaLabel}>Ritmo/dia</Text>
            <Text style={cardStyles.metaValue}>
              {item.dailyMilesNeeded.toLocaleString('pt-BR')} mi
            </Text>
          </View>
        </View>
        <View style={cardStyles.metaBox}>
          <View style={cardStyles.metaIconWrap}>
            <Ionicons name="flag-outline" size={11} color={premium.goldLight} />
          </View>
          <View>
            <Text style={cardStyles.metaLabel}>Falta</Text>
            <Text style={cardStyles.metaValue}>
              {Math.max(0, item.targetMiles - item.progressMiles).toLocaleString('pt-BR')}
            </Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

function ProgramChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
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
      <View style={[styles.chip, selected && styles.chipActive]}>
        {selected && (
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
          />
        )}
        <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  metaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  progDot: {
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: textTokens.dim,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: semantic.successBg,
    borderWidth: 1,
    borderColor: `${semantic.success}44`,
  },
  completedText: {
    color: semantic.success,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.3,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  progressText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  progressPercent: {
    fontFamily: 'Inter_900Black',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  metaBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: surface.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
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
    fontSize: 20,
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
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },

  list: {
    padding: space.md,
    paddingBottom: 120,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,11,24,0.72)',
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
  label: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    fontSize: 13,
  },
  chipTextActive: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
  },
});

const heroStyles = StyleSheet.create({
  label: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: space.md,
  },
  row: {
    alignItems: 'center',
  },
});
