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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import {
  useForumThreads,
  useCreateThread,
  ForumThread,
  usePolls,
  useVotePoll,
} from '../../src/hooks/useCommunity';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors, Gradients } from '../../src/lib/theme';

const TAGS = ['GERAL', 'ROTA', 'PROGRAMA', 'DUVIDA', 'BONUS'];

export default function ForumScreen() {
  const { t } = useTranslation();
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const { data, isLoading } = useForumThreads(selectedTag);
  const { data: polls } = usePolls();
  const create = useCreateThread();
  const vote = useVotePoll();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [newTag, setNewTag] = useState('GERAL');

  const handleCreate = async () => {
    if (!title.trim() || title.length < 3 || !body.trim() || body.length < 10) {
      Alert.alert('Dados inválidos', 'Título min 3 chars, corpo min 10 chars.');
      return;
    }
    try {
      await create.mutateAsync({ title: title.trim(), body: body.trim(), tag: newTag });
      setModalOpen(false);
      setTitle('');
      setBody('');
      setNewTag('GERAL');
    } catch {
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  const renderPoll = (p: any) => (
    <View key={p.id} style={styles.pollCard}>
      <Text style={styles.pollQ}>📊 {p.question}</Text>
      {p.options.map((o: any) => {
        const pct = p.totalVotes > 0 ? Math.round((o.votes / p.totalVotes) * 100) : 0;
        return (
          <TouchableOpacity
            key={o.id}
            onPress={() => vote.mutate({ pollId: p.id, optionId: o.id })}
            style={styles.pollOption}
            accessibilityRole="button"
            accessibilityLabel={`Votar ${o.label} — atualmente ${pct}%`}
          >
            <View style={[styles.pollFill, { width: `${pct}%` }]} />
            <Text style={styles.pollLabel}>{o.label}</Text>
            <Text style={styles.pollPct}>{pct}% ({o.votes})</Text>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.pollTotal}>{p.totalVotes} votos</Text>
    </View>
  );

  const renderThread = ({ item }: { item: ForumThread }) => (
    <TouchableOpacity
      style={styles.threadCard}
      onPress={() => router.push(`/forum/${item.id}` as any)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} por ${item.authorName}, ${item.replyCount} respostas`}
    >
      <View style={styles.threadMeta}>
        <View style={styles.tagChip}>
          <Text style={styles.tagText}>#{item.tag}</Text>
        </View>
        <Text style={styles.author}>{item.authorName}</Text>
      </View>
      <Text style={styles.threadTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.threadBody} numberOfLines={2}>
        {item.body}
      </Text>
      <View style={styles.threadStats}>
        <View style={styles.stat}>
          <Ionicons name="chatbubbles-outline" size={12} color={Colors.text.muted} />
          <Text style={styles.statText}>{item.replyCount}</Text>
        </View>
        <Text style={styles.time}>{timeAgo(item.updatedAt || item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>Fórum</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Nova thread"
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {/* Polls ativas */}
            {polls && polls.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                {polls.slice(0, 2).map(renderPoll)}
              </View>
            )}

            {/* Tag filter */}
            <View style={styles.tagRow}>
              <TouchableOpacity
                onPress={() => setSelectedTag(undefined)}
                style={[styles.filterChip, !selectedTag && styles.filterChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: !selectedTag }}
              >
                <Text style={[styles.filterText, !selectedTag && styles.filterTextActive]}>
                  Tudo
                </Text>
              </TouchableOpacity>
              {TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => setSelectedTag(tag)}
                  style={[styles.filterChip, selectedTag === tag && styles.filterChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedTag === tag }}
                >
                  <Text
                    style={[styles.filterText, selectedTag === tag && styles.filterTextActive]}
                  >
                    #{tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        data={data?.items ?? []}
        keyExtractor={(i) => i.id}
        renderItem={renderThread}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color={Colors.primary.light} />
            </View>
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="Nenhuma thread"
              description="Seja o primeiro a abrir um tópico."
            />
          )
        }
      />

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova thread</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} accessibilityLabel={t('common.close')}>
                <Ionicons name="close" size={22} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="ex: Bônus Livelo→Smiles 150% tá pagando?"
              placeholderTextColor={Colors.text.muted}
              maxLength={200}
              accessibilityLabel="Título da thread"
            />
            <Text style={styles.label}>Corpo</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={body}
              onChangeText={setBody}
              placeholder="Conte o contexto, sua dúvida ou experiência..."
              placeholderTextColor={Colors.text.muted}
              multiline
              numberOfLines={5}
              maxLength={5000}
              accessibilityLabel="Corpo da thread"
            />
            <Text style={styles.label}>Tag</Text>
            <View style={styles.tagRow}>
              {TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => setNewTag(tag)}
                  style={[styles.filterChip, newTag === tag && styles.filterChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: newTag === tag }}
                >
                  <Text style={[styles.filterText, newTag === tag && styles.filterTextActive]}>
                    #{tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.submit}
              onPress={handleCreate}
              disabled={create.isPending}
              accessibilityRole="button"
              accessibilityLabel="Postar"
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
                  <Text style={styles.submitText}>Postar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
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
  list: { paddingBottom: 40 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
  },
  filterChipActive: {
    borderColor: Colors.primary.start,
    backgroundColor: Colors.primary.muted,
  },
  filterText: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },
  filterTextActive: { color: Colors.primary.light },
  threadCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginHorizontal: 16,
  },
  threadMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tagChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.primary.muted,
  },
  tagText: { fontSize: 10, fontWeight: '700', color: Colors.primary.light },
  author: { fontSize: 11, color: Colors.text.muted },
  threadTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, marginBottom: 4 },
  threadBody: { fontSize: 12, color: Colors.text.secondary, lineHeight: 16 },
  threadStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, color: Colors.text.muted, fontWeight: '600' },
  time: { fontSize: 11, color: Colors.text.muted },
  pollCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 10,
  },
  pollQ: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, marginBottom: 8 },
  pollOption: {
    backgroundColor: Colors.bg.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  pollFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Colors.primary.muted,
  },
  pollLabel: { fontSize: 12, color: Colors.text.primary, fontWeight: '600' },
  pollPct: { fontSize: 10, color: Colors.text.muted, marginTop: 2 },
  pollTotal: { fontSize: 10, color: Colors.text.muted, marginTop: 4, textAlign: 'right' },
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
  inputMulti: { height: 120, paddingTop: 12, textAlignVertical: 'top' },
  submit: { marginTop: 20 },
  submitGradient: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
