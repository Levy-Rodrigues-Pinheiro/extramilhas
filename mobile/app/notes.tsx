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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  Note,
} from '../src/hooks/useNotes';
import { EmptyState } from '../src/components/EmptyState';
import { Colors, Gradients } from '../src/lib/theme';

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
  const [remindAt, setRemindAt] = useState(''); // yyyy-mm-dd[THH:MM]
  const [tag, setTag] = useState('GERAL');
  const [recurrence, setRecurrence] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');

  const openModal = (note?: Note) => {
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
      Alert.alert('Dados inválidos', 'Título e corpo obrigatórios.');
      return;
    }
    try {
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
      setModalOpen(false);
    } catch {
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  const handleTogglePin = (note: Note) => {
    update.mutate({ id: note.id, isPinned: !note.isPinned });
  };

  const handleArchive = (note: Note) => {
    update.mutate({ id: note.id, isArchived: true });
  };

  const handleDelete = (note: Note) => {
    Alert.alert('Remover nota?', `"${note.title}" será apagada permanentemente.`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.remove'), style: 'destructive', onPress: () => del.mutate(note.id) },
    ]);
  };

  const renderItem = ({ item }: { item: Note }) => {
    const hasReminder = item.remindAt && !item.remindSent;
    return (
      <TouchableOpacity
        style={[styles.card, item.isPinned && styles.cardPinned]}
        onPress={() => openModal(item)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${item.isPinned ? 'Fixada: ' : ''}${item.title}`}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.isPinned && '📌 '}{item.title}
            </Text>
            <View style={styles.cardMeta}>
              <Text style={styles.cardTag}>#{item.tag}</Text>
              {hasReminder && (
                <View style={styles.remindChip}>
                  <Ionicons name="alarm-outline" size={10} color={Colors.yellow.primary} />
                  <Text style={styles.remindText}>{fmtShortDate(item.remindAt!)}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleTogglePin(item)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            accessibilityRole="button"
            accessibilityLabel={item.isPinned ? 'Desafixar' : 'Fixar'}
          >
            <Ionicons
              name={item.isPinned ? 'star' : 'star-outline'}
              size={18}
              color={item.isPinned ? Colors.yellow.primary : Colors.text.muted}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardBody} numberOfLines={3}>
          {item.body}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => handleArchive(item)}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel="Arquivar"
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="archive-outline" size={14} color={Colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel="Excluir"
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="trash-outline" size={14} color={Colors.red.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
        <Text style={styles.title}>Minhas notas</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => openModal()}
          accessibilityRole="button"
          accessibilityLabel="Nova nota"
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
          icon="document-text-outline"
          title="Nenhuma nota"
          description="Use pra lembrar estratégias, datas de bônus e TODOs. Reminder opcional vira push na data."
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Editar nota' : 'Nova nota'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} accessibilityLabel={t('common.close')}>
                <Ionicons name="close" size={22} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Título"
              placeholderTextColor={Colors.text.muted}
              maxLength={200}
              accessibilityLabel="Título"
            />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={body}
              onChangeText={setBody}
              placeholder="Conteúdo"
              placeholderTextColor={Colors.text.muted}
              multiline
              maxLength={5000}
              accessibilityLabel="Conteúdo"
            />
            <Text style={styles.fieldLabel}>Reminder (opcional, aaaa-mm-dd ou aaaa-mm-ddThh:mm)</Text>
            <TextInput
              style={styles.input}
              value={remindAt}
              onChangeText={setRemindAt}
              placeholder="2026-05-10T14:00"
              placeholderTextColor={Colors.text.muted}
              maxLength={16}
              accessibilityLabel="Data do lembrete"
            />

            {/* Recurrence picker — só faz sentido se tem reminder */}
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
                    ] as Array<{ key: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'; label: string }>
                  ).map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => setRecurrence(r.key)}
                      style={[
                        styles.recurrenceChip,
                        recurrence === r.key && styles.recurrenceChipActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: recurrence === r.key }}
                      accessibilityLabel={r.label}
                    >
                      <Text
                        style={[
                          styles.recurrenceText,
                          recurrence === r.key && styles.recurrenceTextActive,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.fieldLabel}>Tag</Text>
            <TextInput
              style={styles.input}
              value={tag}
              onChangeText={setTag}
              placeholder="GERAL"
              placeholderTextColor={Colors.text.muted}
              maxLength={20}
              accessibilityLabel="Tag"
            />
            <TouchableOpacity
              onPress={handleSave}
              disabled={create.isPending || update.isPending}
              style={styles.submit}
              accessibilityRole="button"
              accessibilityLabel="Salvar"
            >
              <LinearGradient
                colors={Gradients.primary as unknown as readonly [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {create.isPending || update.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Salvar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  cardPinned: { borderColor: Colors.yellow.border, backgroundColor: Colors.yellow.bg },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cardTag: { fontSize: 10, color: Colors.primary.light, fontWeight: '600' },
  remindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.yellow.bg,
  },
  remindText: { fontSize: 9, color: Colors.yellow.primary, fontWeight: '600' },
  cardBody: { fontSize: 12, color: Colors.text.secondary, lineHeight: 16, marginTop: 6 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: { padding: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  fieldLabel: { fontSize: 11, color: Colors.text.secondary, fontWeight: '600', marginTop: 10, marginBottom: 4 },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginTop: 8,
  },
  inputMulti: { minHeight: 120, textAlignVertical: 'top' },
  recurrenceRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  recurrenceChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.surface,
  },
  recurrenceChipActive: {
    borderColor: Colors.primary.start,
    backgroundColor: Colors.primary.muted,
  },
  recurrenceText: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },
  recurrenceTextActive: { color: Colors.primary.light },
  submit: { marginTop: 20 },
  submitGradient: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
