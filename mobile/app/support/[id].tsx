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
import {
  useTicketDetail,
  usePostTicketMessage,
  useCloseTicket,
} from '../../src/hooks/useSupport';
import { Colors } from '../../src/lib/theme';

export default function TicketDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const ticketId = String(params.id);
  const { data, isLoading } = useTicketDetail(ticketId);
  const post = usePostTicketMessage();
  const close = useCloseTicket();
  const [reply, setReply] = useState('');

  const handleReply = async () => {
    if (reply.trim().length === 0) return;
    try {
      await post.mutateAsync({ ticketId, body: reply.trim() });
      setReply('');
    } catch {
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  const handleClose = () => {
    Alert.alert(
      'Fechar ticket',
      'Marcar como resolvido?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Fechar',
          onPress: async () => {
            try {
              await close.mutateAsync(ticketId);
              router.back();
            } catch {
              Alert.alert(t('common.error'), t('errors.generic'));
            }
          },
        },
      ],
    );
  };

  const isClosed = data?.ticket.status === 'RESOLVED' || data?.ticket.status === 'CLOSED';

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
        <Text style={styles.title} numberOfLines={1}>
          {data?.ticket.subject ?? 'Ticket'}
        </Text>
        {!isClosed && data && (
          <TouchableOpacity
            onPress={handleClose}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Fechar ticket"
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.green.primary} />
          </TouchableOpacity>
        )}
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
            <Text style={{ color: Colors.text.secondary }}>Ticket não encontrado</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {data.messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.msg,
                  m.isFromAdmin ? styles.msgAdmin : styles.msgUser,
                ]}
                accessible
                accessibilityLabel={`Mensagem de ${m.authorName} ${m.isFromAdmin ? '(suporte)' : ''}`}
              >
                <View style={styles.msgHeader}>
                  <Text
                    style={[
                      styles.msgAuthor,
                      m.isFromAdmin && { color: Colors.primary.light },
                    ]}
                  >
                    {m.isFromAdmin ? '🎧 Suporte' : m.authorName}
                  </Text>
                  <Text style={styles.msgTime}>{timeAgo(m.createdAt)}</Text>
                </View>
                <Text style={styles.msgBody}>{m.body}</Text>
              </View>
            ))}

            {isClosed && (
              <View style={styles.closedNotice}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.green.primary} />
                <Text style={styles.closedText}>
                  Ticket resolvido. Se o problema voltar, abra um novo.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {!isClosed && data && (
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
              disabled={post.isPending || reply.trim().length === 0}
              style={[
                styles.sendBtn,
                (post.isPending || reply.trim().length === 0) && styles.sendBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              {post.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
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
  title: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 20 },
  msg: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  msgUser: {
    backgroundColor: Colors.bg.card,
    borderColor: Colors.border.subtle,
  },
  msgAdmin: {
    backgroundColor: Colors.primary.muted,
    borderColor: Colors.primary.start,
  },
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  msgAuthor: { fontSize: 12, fontWeight: '700', color: Colors.text.primary },
  msgTime: { fontSize: 10, color: Colors.text.muted },
  msgBody: { fontSize: 13, color: Colors.text.primary, lineHeight: 18 },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.green.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.green.border,
    marginTop: 16,
  },
  closedText: { flex: 1, fontSize: 12, color: Colors.green.primary, fontWeight: '600' },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.bg.card,
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
