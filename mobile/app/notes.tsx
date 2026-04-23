import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  Note,
} from '../src/hooks/useNotes';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
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

export default function NotesScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = useNotes();
  const create = useCreateNote();
  const update = useUpdateNote();
  const del = useDeleteNote();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [tag, setTag] = useState('GERAL');
  const [recurrence, setRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');

  const openModal = (note?: Note) => {
    haptics.tap();
    if (note) {
      setEditing(note);
      setTitle(note.title);
      setBody(note.body);
      setRemindAt(note.remindAt?.slice(0, 16) ?? '');
      setTag(note.tag);
      const rec = ((note as any).recurrence ?? 'NONE') as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
      setRecurrence(rec);
    } else {
      setEditing(null);
      setTitle('');
      setBody('');
      setRemindAt('');
      setTag('GERAL');
      setRecurrence('NONE');
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      haptics.error();
      Alert.alert('Dados inválidos', 'Título e corpo obrigatórios.');
      return;
    }
    try {
      haptics.medium();
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          title,
          body,
          tag,
          remindAt: remindAt ? remindAt : null,
          recurrence,
        } as any);
      } else {
        await create.mutateAsync({
          title,
          body,
          tag,
          remindAt: remindAt || undefined,
          recurrence,
        } as any);
      }
      haptics.success();
      setModalOpen(false);
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  const handleTogglePin = (note: Note) => {
    haptics.select();
    update.mutate({ id: note.id, isPinned: !note.isPinned });
  };

  const handleDelete = (note: Note) => {
    haptics.warning();
    Alert.alert('Remover nota?', `"${note.title}" será apagada permanentemente.`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: () => {
          haptics.heavy();
          del.mutate(note.id);
        },
      },
    ]);
  };

  const handleArchive = (note: Note) => {
    haptics.select();
    update.mutate({ id: note.id, isArchived: true });
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
            <Text style={styles.title}>Minhas notas</Text>
            <Text style={styles.subtitle}>Lembretes e estratégias</Text>
          </View>
          <PressableScale
            onPress={() => openModal()}
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

        {isLoading ? (
          <View style={{ padding: space.md, gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : !data || data.length === 0 ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="search"
                title="Nenhuma nota ainda"
                description="Use pra lembrar estratégias, datas de bônus e TODOs. Reminder opcional vira push na data."
                ctaLabel="Criar primeira nota"
                onCtaPress={() => openModal()}
              />
            </GlassCard>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(n) => n.id}
            renderItem={({ item, index }) => (
              <StaggerItem index={index} baseDelay={80}>
                <NoteCard
                  note={item}
                  onPress={() => openModal(item)}
                  onTogglePin={() => handleTogglePin(item)}
                  onArchive={() => handleArchive(item)}
                  onDelete={() => handleDelete(item)}
                />
              </StaggerItem>
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Modal: new/edit note */}
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
                      <Text style={styles.modalTitle}>
                        {editing ? 'Editar nota' : 'Nova nota'}
                      </Text>
                      <PressableScale
                        onPress={() => setModalOpen(false)}
                        haptic="tap"
                        style={styles.modalClose}
                      >
                        <Ionicons name="close" size={20} color={textTokens.secondary} />
                      </PressableScale>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                      <FloatingLabelInput
                        label="Título"
                        iconLeft="document-text-outline"
                        value={title}
                        onChangeText={setTitle}
                        maxLength={200}
                      />

                      <Text style={styles.fieldLabel}>Conteúdo</Text>
                      <View style={styles.bodyInputWrap}>
                        <TextInput
                          value={body}
                          onChangeText={setBody}
                          placeholder="Digite aqui..."
                          placeholderTextColor={textTokens.muted}
                          multiline
                          maxLength={5000}
                          style={styles.bodyInput}
                          selectionColor={aurora.cyan}
                        />
                      </View>

                      <FloatingLabelInput
                        label="Reminder (aaaa-mm-dd[Thh:mm])"
                        iconLeft="alarm-outline"
                        value={remindAt}
                        onChangeText={setRemindAt}
                        maxLength={16}
                      />

                      {remindAt.length > 0 && (
                        <>
                          <Text style={styles.fieldLabel}>Repetir</Text>
                          <View style={styles.recurrenceRow}>
                            {(
                              [
                                { key: 'NONE', label: 'Uma vez' },
                                { key: 'DAILY', label: 'Todo dia' },
                                { key: 'WEEKLY', label: 'Semanal' },
                                { key: 'MONTHLY', label: 'Mensal' },
                              ] as Array<{
                                key: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
                                label: string;
                              }>
                            ).map((r) => (
                              <RecurrenceChip
                                key={r.key}
                                label={r.label}
                                selected={recurrence === r.key}
                                onPress={() => setRecurrence(r.key)}
                              />
                            ))}
                          </View>
                        </>
                      )}

                      <FloatingLabelInput
                        label="Tag"
                        iconLeft="pricetag-outline"
                        value={tag}
                        onChangeText={setTag}
                        maxLength={20}
                      />

                      <AuroraButton
                        label={editing ? 'Salvar alterações' : 'Criar nota'}
                        onPress={handleSave}
                        loading={create.isPending || update.isPending}
                        variant="primary"
                        size="lg"
                        icon="checkmark"
                        iconPosition="left"
                        fullWidth
                        haptic="medium"
                      />
                    </ScrollView>
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

// ─── NoteCard ───────────────────────────────────────────────────────────

function NoteCard({
  note,
  onPress,
  onTogglePin,
  onArchive,
  onDelete,
}: {
  note: Note;
  onPress: () => void;
  onTogglePin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const hasReminder = note.remindAt && !note.remindSent;
  return (
    <PressableScale onPress={onPress} haptic="tap">
      <GlassCard
        radiusSize="lg"
        padding={14}
        glow={note.isPinned ? 'gold' : 'none'}
      >
        <View style={cardStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={cardStyles.title} numberOfLines={1}>
              {note.isPinned && '📌 '}
              {note.title}
            </Text>
            <View style={cardStyles.metaRow}>
              <View style={cardStyles.tagChip}>
                <Text style={cardStyles.tagText}>#{note.tag}</Text>
              </View>
              {hasReminder && (
                <View style={cardStyles.reminderChip}>
                  <Ionicons name="alarm" size={10} color={premium.goldLight} />
                  <Text style={cardStyles.reminderText}>
                    {fmtShortDate(note.remindAt!)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <PressableScale onPress={onTogglePin} haptic="none" hitSlop={8}>
            <Ionicons
              name={note.isPinned ? 'star' : 'star-outline'}
              size={18}
              color={note.isPinned ? premium.goldLight : textTokens.muted}
            />
          </PressableScale>
        </View>

        <Text style={cardStyles.body} numberOfLines={3}>
          {note.body}
        </Text>

        <View style={cardStyles.actions}>
          <PressableScale
            onPress={onArchive}
            haptic="none"
            style={cardStyles.actionBtn}
            hitSlop={8}
          >
            <Ionicons name="archive-outline" size={13} color={textTokens.muted} />
            <Text style={cardStyles.actionText}>Arquivar</Text>
          </PressableScale>
          <PressableScale
            onPress={onDelete}
            haptic="none"
            style={cardStyles.actionBtn}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={13} color={semantic.danger} />
            <Text style={[cardStyles.actionText, { color: semantic.danger }]}>
              Excluir
            </Text>
          </PressableScale>
        </View>
      </GlassCard>
    </PressableScale>
  );
}

function RecurrenceChip({
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
      <View style={[styles.recChip, selected && styles.recChipActive]}>
        {selected && (
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
          />
        )}
        <Text style={[styles.recText, selected && styles.recTextActive]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ─── Styles ─────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}44`,
  },
  tagText: {
    color: aurora.cyan,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: premium.goldSoft,
    borderWidth: 1,
    borderColor: `${premium.gold}55`,
  },
  reminderText: {
    color: premium.goldLight,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  body: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
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
    maxHeight: '92%',
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
  fieldLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bodyInputWrap: {
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    borderRadius: 14,
    padding: 12,
    minHeight: 100,
    marginBottom: 18,
  },
  bodyInput: {
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  recurrenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
  recChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  recChipActive: {
    borderColor: 'transparent',
  },
  recText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  recTextActive: {
    color: '#041220',
    fontFamily: 'Inter_700Bold',
  },
});
