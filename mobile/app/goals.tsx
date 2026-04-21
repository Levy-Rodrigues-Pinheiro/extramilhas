import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import {
  useGoals,
  useCreateGoal,
  useDeleteGoal,
  UserGoal,
} from '../src/hooks/useEngagement';
import { usePrograms } from '../src/hooks/usePrograms';
import { EmptyState } from '../src/components/EmptyState';
import { Colors, Gradients } from '../src/lib/theme';

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
  const [targetDate, setTargetDate] = useState(''); // yyyy-mm-dd

  const handleCreate = async () => {
    const miles = parseInt(targetMiles.replace(/\D/g, ''), 10);
    if (!title.trim() || !miles || miles < 1000 || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      Alert.alert('Dados inválidos', 'Preencha título, milhas alvo (min 1000) e data (aaaa-mm-dd).');
      return;
    }
    try {
      await create.mutateAsync({ title: title.trim(), programId, targetMiles: miles, targetDate });
      setModalOpen(false);
      setTitle('');
      setProgramId(undefined);
      setTargetMiles('');
      setTargetDate('');
    } catch {
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  const renderGoal = ({ item }: { item: UserGoal }) => {
    const completed = !!item.completedAt;
    const barColor = completed ? Colors.green.primary : Colors.primary.light;
    const programName = programs?.find((p: any) => p.id === item.programId)?.name;

    return (
      <View
        style={[styles.card, completed && { borderColor: Colors.green.border }]}
        accessibilityRole="summary"
        accessibilityLabel={`${item.title}, ${item.percent}% concluído, ${item.daysLeft} dias restantes`}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>
              {programName ? `${programName} · ` : ''}
              Meta: {item.targetMiles.toLocaleString('pt-BR')} mi
            </Text>
          </View>
          {completed ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.green.primary} />
              <Text style={styles.completedBadgeText}>Concluída</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Excluir meta', `Remover "${item.title}"?`, [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: t('common.remove'),
                    style: 'destructive',
                    onPress: () => del.mutate(item.id),
                  },
                ]);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Excluir meta ${item.title}`}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.red.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {item.progressMiles.toLocaleString('pt-BR')} / {item.targetMiles.toLocaleString('pt-BR')} mi
          </Text>
          <Text style={styles.progressPercent}>{item.percent.toFixed(1)}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, item.percent)}%`, backgroundColor: barColor },
            ]}
          />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Prazo</Text>
            <Text style={styles.metaValue}>{item.daysLeft}d</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Ritmo/dia</Text>
            <Text style={styles.metaValue}>
              {item.dailyMilesNeeded.toLocaleString('pt-BR')} mi
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Falta</Text>
            <Text style={styles.metaValue}>
              {Math.max(0, item.targetMiles - item.progressMiles).toLocaleString('pt-BR')} mi
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Minhas Metas</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Nova meta"
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary.light} />
        </View>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="flag-outline"
          title="Nenhuma meta"
          description="Defina uma meta tipo 'Europa em Dez' e acompanhe seu progresso em milhas."
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(g) => g.id}
          renderItem={renderGoal}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova meta</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} accessibilityLabel={t('common.close')}>
                <Ionicons name="close" size={22} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="ex: Paris em Dez/2026"
                placeholderTextColor={Colors.text.muted}
                accessibilityLabel="Título da meta"
              />

              <Text style={styles.label}>Programa (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setProgramId(undefined)}
                    style={[styles.chip, !programId && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !programId }}
                  >
                    <Text style={[styles.chipText, !programId && styles.chipTextActive]}>
                      Qualquer
                    </Text>
                  </TouchableOpacity>
                  {(programs ?? []).map((p: any) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setProgramId(p.id)}
                      style={[styles.chip, programId === p.id && styles.chipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: programId === p.id }}
                    >
                      <Text
                        style={[styles.chipText, programId === p.id && styles.chipTextActive]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Milhas alvo</Text>
              <TextInput
                style={styles.input}
                value={targetMiles}
                onChangeText={(v) => setTargetMiles(v.replace(/\D/g, ''))}
                keyboardType="numeric"
                placeholder="150000"
                placeholderTextColor={Colors.text.muted}
                accessibilityLabel="Milhas alvo"
              />

              <Text style={styles.label}>Data alvo (aaaa-mm-dd)</Text>
              <TextInput
                style={styles.input}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="2026-12-15"
                placeholderTextColor={Colors.text.muted}
                maxLength={10}
                accessibilityLabel="Data alvo"
              />

              <TouchableOpacity
                style={styles.submit}
                onPress={handleCreate}
                disabled={create.isPending}
                accessibilityRole="button"
                accessibilityLabel="Criar meta"
              >
                <LinearGradient
                  colors={Gradients.primary as unknown as readonly [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {create.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>Criar meta</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.start,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  cardSub: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.green.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.green.border,
  },
  completedBadgeText: { fontSize: 11, color: Colors.green.primary, fontWeight: '700' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600' },
  progressPercent: { fontSize: 13, fontWeight: '800', color: Colors.primary.light },
  progressBg: {
    height: 8,
    backgroundColor: Colors.bg.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  metaRow: { flexDirection: 'row', gap: 8 },
  metaBox: {
    flex: 1,
    backgroundColor: Colors.bg.surface,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  metaLabel: { fontSize: 10, color: Colors.text.muted, textTransform: 'uppercase' },
  metaValue: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, marginTop: 2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  label: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.surface,
  },
  chipActive: {
    borderColor: Colors.primary.start,
    backgroundColor: Colors.primary.muted,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary },
  chipTextActive: { color: Colors.primary.light },
  submit: { marginTop: 20 },
  submitGradient: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
