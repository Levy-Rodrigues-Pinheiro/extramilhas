import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  useTicketDetail,
  usePostTicketMessage,
  useCloseTicket,
} from '../../src/hooks/useSupport';
import { useAuthStore } from '../../src/store/auth.store';
import {
  AuroraBackground,
  GlassCard,
  PressableScale,
  StaggerItem,
  SkeletonCard,
  EmptyStateIllustrated,
  aurora,
  premium,
  semantic,
  surface,
  text as textTokens,
  space,
  gradients,
  motion,
  haptics,
} from '../../src/components/primitives';

const STATUS_META: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Aberto', color: aurora.cyan },
  AWAITING_USER: { label: 'Aguardando você', color: premium.goldLight },
  RESOLVED: { label: 'Resolvido', color: semantic.success },
  CLOSED: { label: 'Fechado', color: textTokens.muted },
};

export default function TicketDetailScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ id: string }>();
  const ticketId = String(params.id);
  const { data, isLoading } = useTicketDetail(ticketId);
  const post = usePostTicketMessage();
  const close = useCloseTicket();
  const [reply, setReply] = useState('');

  const handleReply = async () => {
    if (reply.trim().length === 0) return;
    try {
      haptics.medium();
      await post.mutateAsync({ ticketId, body: reply.trim() });
      haptics.success();
      setReply('');
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  const handleClose = () => {
    haptics.warning();
    Alert.alert('Fechar ticket', 'Marcar como resolvido?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'Fechar',
        onPress: async () => {
          try {
            haptics.heavy();
            await close.mutateAsync(ticketId);
            router.back();
          } catch {
            haptics.error();
            Alert.alert(t('common.error'), t('errors.generic'));
          }
        },
      },
    ]);
  };

  const isClosed = data?.ticket.status === 'RESOLVED' || data?.ticket.status === 'CLOSED';
  const meta = data ? STATUS_META[data.ticket.status] ?? STATUS_META.OPEN : STATUS_META.OPEN;

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title} numberOfLines={1}>
              {data?.ticket.subject ?? 'Ticket'}
            </Text>
            {data && (
              <View style={styles.subtitleRow}>
                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                <Text style={[styles.subtitle, { color: meta.color }]}>{meta.label}</Text>
              </View>
            )}
          </View>
          {!isClosed && data && (
            <PressableScale
              onPress={handleClose}
              haptic="tap"
              style={[styles.iconBtn, { backgroundColor: semantic.successBg }]}
            >
              <Ionicons name="checkmark-done" size={18} color={semantic.success} />
            </PressableScale>
          )}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {isLoading ? (
            <View style={{ padding: space.md, gap: 12 }}>
              <SkeletonCard />
            </View>
          ) : !data ? (
            <View style={{ padding: space.md }}>
              <GlassCard radiusSize="xl" padding={0}>
                <EmptyStateIllustrated
                  variant="search"
                  title="Ticket não encontrado"
                />
              </GlassCard>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Ticket meta card */}
              <Animated.View
                entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
              >
                <GlassCard radiusSize="lg" padding={14}>
                  <View style={styles.catRow}>
                    <View style={styles.catIcon}>
                      <Ionicons name="help-circle" size={16} color={aurora.cyan} />
                    </View>
                    <Text style={styles.catText}>#{data.ticket.category}</Text>
                    <Text style={styles.dateText}>
                      {new Date(data.ticket.createdAt).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  <Text style={styles.opBody}>{(data.ticket as any).body ?? ''}</Text>
                </GlassCard>
              </Animated.View>

              {/* Messages */}
              {data.messages && data.messages.length > 0 && (
                <View style={{ marginTop: space.md, gap: 10 }}>
                  <Text style={styles.sectionLabel}>MENSAGENS</Text>
                  {data.messages.map((msg: any, i: number) => {
                    const isMe = msg.authorId === user?.id;
                    const isSupport = !isMe && msg.isFromSupport;
                    return (
                      <StaggerItem key={msg.id} index={i} baseDelay={60}>
                        <MessageBubble msg={msg} isMe={isMe} isSupport={isSupport} />
                      </StaggerItem>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}

          {!isClosed && (
            <View style={styles.replyBar}>
              <View style={styles.replyInputWrap}>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  placeholder="Responder..."
                  placeholderTextColor={textTokens.muted}
                  multiline
                  maxLength={2000}
                  style={styles.replyInput}
                  selectionColor={aurora.cyan}
                />
              </View>
              <PressableScale
                onPress={handleReply}
                disabled={post.isPending || reply.trim().length === 0}
                haptic="none"
                style={[
                  styles.sendBtn,
                  (post.isPending || reply.trim().length === 0) && { opacity: 0.4 },
                ]}
              >
                <LinearGradient
                  colors={gradients.auroraCyanMagenta}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="arrow-up" size={18} color="#041220" />
              </PressableScale>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

function MessageBubble({
  msg,
  isMe,
  isSupport,
}: {
  msg: any;
  isMe: boolean;
  isSupport: boolean;
}) {
  return (
    <View style={[msgStyles.wrap, isMe && { alignItems: 'flex-end' }]}>
      {!isMe && (
        <View style={msgStyles.authorRow}>
          <View
            style={[
              msgStyles.supportBadge,
              isSupport && {
                backgroundColor: premium.goldSoft,
                borderColor: `${premium.gold}66`,
              },
            ]}
          >
            <Ionicons
              name={isSupport ? 'shield-checkmark' : 'person'}
              size={10}
              color={isSupport ? premium.goldLight : aurora.cyan}
            />
            <Text
              style={[
                msgStyles.author,
                isSupport && { color: premium.goldLight },
              ]}
            >
              {isSupport ? 'SUPORTE' : msg.authorName ?? 'Você'}
            </Text>
          </View>
        </View>
      )}
      <View style={[msgStyles.bubble, isMe && msgStyles.bubbleMe]}>
        {isMe && (
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Text style={[msgStyles.body, isMe && msgStyles.bodyMe]}>{msg.body}</Text>
      </View>
      <Text style={msgStyles.time}>
        {new Date(msg.createdAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

const msgStyles = StyleSheet.create({
  wrap: {
    maxWidth: '82%',
    alignSelf: 'flex-start',
  },
  authorRow: {
    marginBottom: 4,
    marginLeft: 8,
  },
  supportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}55`,
    alignSelf: 'flex-start',
  },
  author: {
    color: aurora.cyan,
    fontFamily: 'Inter_900Black',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    overflow: 'hidden',
  },
  bubbleMe: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 6,
    alignSelf: 'flex-end',
    borderColor: 'transparent',
  },
  body: {
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  bodyMe: {
    color: '#041220',
    fontFamily: 'Inter_600SemiBold',
  },
  time: {
    color: textTokens.dim,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    marginTop: 3,
    marginHorizontal: 8,
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
    fontSize: 16,
    letterSpacing: -0.2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  subtitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  content: {
    padding: space.md,
    paddingBottom: 120,
  },
  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  catIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catText: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  dateText: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  opBody: {
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: surface.separator,
    backgroundColor: 'rgba(10,16,32,0.92)',
  },
  replyInputWrap: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  replyInput: {
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
