import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeIn,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  useFamily,
  useAddFamilyMember,
  useDeleteFamilyMember,
  useUpdateFamilyBalance,
  useDeleteFamilyBalance,
} from '../src/hooks/useFamily';
import { usePrograms } from '../src/hooks/usePrograms';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  FamilyAvatarStack,
  AnimatedNumber,
  StaggerItem,
  SkeletonCard,
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

export default function FamilyScreen() {
  const { t } = useTranslation();
  const { data: members, isLoading } = useFamily();
  const addMember = useAddFamilyMember();
  const deleteMember = useDeleteFamilyMember();
  const updateBalance = useUpdateFamilyBalance();
  const deleteBalance = useDeleteFamilyBalance();
  const { data: programs } = usePrograms();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim() || !newRelationship.trim()) {
      haptics.error();
      Alert.alert(t('common.error'), t('family.required_name_rel'));
      return;
    }
    try {
      haptics.medium();
      await addMember.mutateAsync({
        name: newName.trim(),
        relationship: newRelationship.trim(),
      });
      haptics.success();
      setNewName('');
      setNewRelationship('');
      setShowAddForm(false);
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('family.error_add_member'));
    }
  };

  const handleDelete = (id: string, name: string) => {
    haptics.warning();
    Alert.alert(t('family.remove_member_title'), t('family.remove_member_text', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => {
          haptics.heavy();
          deleteMember.mutate(id);
        },
      },
    ]);
  };

  const getTotalMiles = (balances: any[]) =>
    (balances ?? []).reduce((sum: number, b: any) => sum + (b.balance ?? 0), 0);

  const totalFamilyMiles = React.useMemo(() => {
    return (members ?? []).reduce(
      (sum: number, m: any) => sum + getTotalMiles(m.balances),
      0,
    );
  }, [members]);

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Família</Text>
            <Text style={styles.subtitle}>Milhas compartilhadas</Text>
          </View>
          <PressableScale
            onPress={() => {
              haptics.medium();
              setShowAddForm(true);
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
            <Ionicons name="person-add" size={18} color="#041220" />
          </PressableScale>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : !members || members.length === 0 ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="wallet"
                title="Adicione familiares"
                description="Acompanhe saldos de esposa, filhos, pais — ajuda planejar viagens juntos."
                ctaLabel="Adicionar primeiro membro"
                onCtaPress={() => setShowAddForm(true)}
              />
            </GlassCard>
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <View style={{ marginBottom: space.md }}>
                {/* Family hero card */}
                <Animated.View
                  entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
                >
                  <View style={heroStyles.card}>
                    <LinearGradient
                      colors={gradients.aurora as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.5)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[StyleSheet.absoluteFill, { height: '45%' }]}
                    />

                    <View style={heroStyles.content}>
                      {/* Avatar stack */}
                      <FamilyAvatarStack
                        members={members.map((m: any) => ({
                          id: m.id,
                          name: m.name,
                        }))}
                        size={52}
                        max={5}
                      />

                      <Text style={heroStyles.label}>TOTAL DA FAMÍLIA</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <AnimatedNumber
                          value={totalFamilyMiles}
                          format="integer"
                          style={heroStyles.value}
                        />
                        <Text style={heroStyles.unit}> mi</Text>
                      </View>
                      <Text style={heroStyles.subtext}>
                        {members.length} {members.length === 1 ? 'membro' : 'membros'}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </View>
            }
            renderItem={({ item, index }) => (
              <StaggerItem index={index} baseDelay={100}>
                <MemberCard
                  member={item}
                  expanded={expandedId === item.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }
                  onDelete={() => handleDelete(item.id, item.name)}
                  totalMiles={getTotalMiles(item.balances)}
                />
              </StaggerItem>
            )}
            contentContainerStyle={styles.content}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Add modal */}
        {showAddForm && (
          <Modal visible animationType="none" transparent>
            <Pressable style={styles.modalBackdrop} onPress={() => setShowAddForm(false)}>
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
                      <Text style={styles.modalTitle}>Adicionar familiar</Text>
                      <PressableScale
                        onPress={() => setShowAddForm(false)}
                        haptic="tap"
                        style={styles.modalClose}
                      >
                        <Ionicons name="close" size={20} color={textTokens.secondary} />
                      </PressableScale>
                    </View>

                    <FloatingLabelInput
                      label="Nome"
                      iconLeft="person-outline"
                      value={newName}
                      onChangeText={setNewName}
                    />

                    <FloatingLabelInput
                      label="Relação (esposa, filho, pai…)"
                      iconLeft="people-outline"
                      value={newRelationship}
                      onChangeText={setNewRelationship}
                    />

                    <AuroraButton
                      label="Adicionar"
                      onPress={handleAdd}
                      loading={addMember.isPending}
                      disabled={!newName.trim() || !newRelationship.trim()}
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
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

function MemberCard({
  member,
  expanded,
  onToggleExpand,
  onDelete,
  totalMiles,
}: {
  member: any;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  totalMiles: number;
}) {
  return (
    <GlassCard radiusSize="lg" padding={14}>
      <PressableScale onPress={onToggleExpand} haptic="tap">
        <View style={memStyles.row}>
          <FamilyAvatarStack members={[{ id: member.id, name: member.name }]} size={44} max={1} />
          <View style={{ flex: 1 }}>
            <Text style={memStyles.name}>{member.name}</Text>
            <Text style={memStyles.relationship}>{member.relationship}</Text>
          </View>
          <View style={memStyles.milesCol}>
            <AnimatedNumber
              value={totalMiles}
              format="integer"
              style={memStyles.miles}
            />
            <Text style={memStyles.milesLabel}>mi total</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={textTokens.muted}
          />
        </View>
      </PressableScale>

      {expanded && (
        <Animated.View
          entering={FadeIn.duration(motion.timing.short)}
          style={memStyles.expanded}
        >
          {member.balances?.length ? (
            member.balances.map((b: any) => (
              <View key={b.programId} style={memStyles.balanceRow}>
                <View style={memStyles.programDot} />
                <Text style={memStyles.programName}>{b.program?.name ?? b.programId}</Text>
                <Text style={memStyles.balanceVal}>
                  {b.balance.toLocaleString('pt-BR')}
                </Text>
              </View>
            ))
          ) : (
            <Text style={memStyles.empty}>Sem saldos cadastrados</Text>
          )}
          <PressableScale onPress={onDelete} haptic="none" style={memStyles.deleteBtn}>
            <Ionicons name="trash-outline" size={13} color={semantic.danger} />
            <Text style={memStyles.deleteText}>Remover {member.name}</Text>
          </PressableScale>
        </Animated.View>
      )}
    </GlassCard>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 180,
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  content: {
    padding: space.xl,
    alignItems: 'center',
    zIndex: 1,
    gap: 10,
  },
  label: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 6,
  },
  value: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.8,
  },
  unit: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  subtext: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
});

const memStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  relationship: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  milesCol: {
    alignItems: 'flex-end',
  },
  miles: {
    color: aurora.cyan,
    fontFamily: 'Inter_900Black',
    fontSize: 14,
  },
  milesLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    marginTop: 1,
  },
  expanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
    gap: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  programDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: aurora.cyan,
  },
  programName: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  balanceVal: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  empty: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
    paddingVertical: 6,
  },
  deleteText: {
    color: semantic.danger,
    fontFamily: 'Inter_600SemiBold',
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
  },
  content: {
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
    borderColor: surface.glassBorder,
  },
  modalHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: space.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
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
});
