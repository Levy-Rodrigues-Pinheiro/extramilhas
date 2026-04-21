import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThreadDetail, useCreatePost } from '../../src/hooks/useCommunity';
import { Colors } from '../../src/lib/theme';

export default function ThreadDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const threadId = String(params.id);
  const { data, isLoading } = useThreadDetail(threadId);
  const createPost = useCreatePost();
  const [reply, setReply] = useState('');

  const handleReply = async () => {
    if (reply.trim().length < 1) return;
    try {
      await createPost.mutateAsync({ threadId, body: reply.trim() });
      setReply('');
    } catch {
      Alert.alert(t('common.error'), t('errors.generic'));
    }
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {data?.thread?.title ?? 'Thread'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary.light} />
          </View>
        ) : !data ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Thread não encontrada</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Thread OP */}
            <View style={styles.opCard}>
              <View style={styles.tagChip}>
                <Text style={styles.tagText}>#{data.thread.tag}</Text>
              </View>
              <Text style={styles.opTitle}>{data.thread.title}</Text>
              <Text style={styles.opMeta}>
                {data.thread.authorName} · {timeAgo(data.thread.createdAt)}
              </Text>
              <Text style={styles.opBody}>{data.thread.body}</Text>
            </View>

            {/* Posts */}
            {data.posts.length === 0 ? (
              <Text style={styles.noReplies}>Nenhuma resposta ainda. Seja o primeiro 👇</Text>
            ) : (
              data.posts.map((p) => (
                <View key={p.id} style={styles.postCard}>
                  <View style={styles.postMeta}>
                    <Text style={styles.postAuthor}>{p.authorName}</Text>
                    <Text style={styles.postTime}>{timeAgo(p.createdAt)}</Text>
                  </View>
                  <Text style={styles.postBody}>{p.body}</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Reply bar */}
        <View style={styles.replyBar}>
          <TextInput
            style={styles.replyInput}
            value={reply}
            onChangeText={setReply}
            placeholder="Escrever resposta..."
            placeholderTextColor={Colors.text.muted}
            multiline
            maxLength={5000}
            accessibilityLabel="Campo de resposta"
          />
          <TouchableOpacity
            onPress={handleReply}
            disabled={createPost.isPending || reply.trim().length === 0}
            style={[
              styles.sendBtn,
              (createPost.isPending || reply.trim().length === 0) && styles.sendBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Enviar resposta"
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            {createPost.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.text.secondary },
  content: { padding: 16, paddingBottom: 20 },
  opCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 12,
  },
  tagChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: Colors.primary.muted,
    marginBottom: 6,
  },
  tagText: { fontSize: 10, fontWeight: '700', color: Colors.primary.light },
  opTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  opMeta: { fontSize: 11, color: Colors.text.muted, marginVertical: 6 },
  opBody: { fontSize: 13, color: Colors.text.primary, lineHeight: 18 },
  noReplies: { textAlign: 'center', color: Colors.text.muted, fontSize: 12, padding: 20 },
  postCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 8,
  },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  postAuthor: { fontSize: 12, fontWeight: '700', color: Colors.primary.light },
  postTime: { fontSize: 10, color: Colors.text.muted },
  postBody: { fontSize: 13, color: Colors.text.primary, lineHeight: 18 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.bg.card,
    backgroundColor: Colors.bg.primary,
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.bg.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text.primary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.start,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.bg.card, opacity: 0.6 },
});
