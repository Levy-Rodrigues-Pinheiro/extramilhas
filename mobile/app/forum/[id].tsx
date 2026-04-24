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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useThreadDetail, useCreatePost } from '../../src/hooks/useCommunity';
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

const TAG_COLORS: Record<string, string> = {
  GERAL: aurora.cyan,
  ROTA: semantic.success,
  PROGRAMA: aurora.magenta,
  DUVIDA: premium.goldLight,
  BONUS: aurora.iris,
};

/**
 * Thread detail v2 — iMessage-style bubbles.
 *
 * OP bubble destacado (aurora border + badge "AUTOR")
 * Replies em bubbles alternadas (left secondary / right primary aurora)
 * Reply bar sticky no bottom com send button gradient
 */
export default function ThreadDetailScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ id: string }>();
  const threadId = String(params.id);
  const { data, isLoading } = useThreadDetail(threadId);
  const createPost = useCreatePost();
  const [reply, setReply] = useState('');

  const handleReply = async () => {
    if (reply.trim().length < 1) return;
    try {
      haptics.medium();
      await createPost.mutateAsync({ threadId, body: reply.trim() });
      haptics.success();
      setReply('');
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  const tagColor = data ? TAG_COLORS[data.thread.tag] ?? aurora.cyan : aurora.cyan;

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title} numberOfLines={1}>
              {data?.thread?.title ?? 'Thread'}
            </Text>
            {data && (
              <Text style={styles.subtitle}>
                {data.posts.length} {data.posts.length === 1 ? 'resposta' : 'respostas'}
              </Text>
            )}
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {isLoading ? (
            <View style={{ padding: space.md, gap: 12 }}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : !data ? (
            <View style={{ padding: space.md }}>
              <GlassCard radiusSize="xl" padding={0}>
                <EmptyStateIllustrated
                  variant="search"
                  title="Thread não encontrada"
                  description="Este post pode ter sido removido."
                />
              </GlassCard>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* OP */}
              <Animated.View
                entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
              >
                <View style={opStyles.card}>
                  <LinearGradient
                    colors={[`${tagColor}26`, `${tagColor}0A`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View
                    style={[
                      opStyles.border,
                      { borderColor: `${tagColor}55` },
                    ]}
                    pointerEvents="none"
                  />

                  <View style={opStyles.content}>
                    <View style={opStyles.meta}>
                      <View
                        style={[
                          opStyles.tagChip,
                          { backgroundColor: `${tagColor}1F`, borderColor: `${tagColor}55` },
                        ]}
                      >
                        <Text style={[opStyles.tagText, { color: tagColor }]}>
                          #{data.thread.tag}
                        </Text>
                      </View>
                      <View style={opStyles.opBadge}>
                        <Ionicons name="star" size={9} color={premium.goldLight} />
                        <Text style={opStyles.opBadgeText}>AUTOR</Text>
                      </View>
                    </View>

                    <Text style={opStyles.title}>{data.thread.title}</Text>

                    <View style={opStyles.authorRow}>
                      <View style={opStyles.avatar}>
                        <Text style={opStyles.avatarText}>
                          {data.thread.authorName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={opStyles.author}>{data.thread.authorName}</Text>
                      <View style={opStyles.dot} />
                      <Text style={opStyles.time}>{timeAgo(data.thread.createdAt)}</Text>
                    </View>

                    <Text style={opStyles.body}>{data.thread.body}</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Posts */}
              {data.posts.length === 0 ? (
                <View style={{ marginTop: space.lg }}>
                  <GlassCard radiusSize="lg" padding={24} style={styles.noReplies}>
                    <Ionicons name="chatbubble-ellipses" size={28} color={textTokens.muted} />
                    <Text style={styles.noRepliesTitle}>Nenhuma resposta ainda</Text>
                    <Text style={styles.noRepliesText}>
                      Seja o primeiro a responder 👇
                    </Text>
                  </GlassCard>
                </View>
              ) : (
                <View style={{ marginTop: space.md, gap: 10 }}>
                  <Text style={styles.sectionLabel}>RESPOSTAS</Text>
                  {data.posts.map((p, i) => {
                    const isMe = user?.id === p.authorId;
                    return (
                      <StaggerItem key={p.id} index={i} baseDelay={80}>
                        <ReplyBubble post={p} isMe={isMe} />
                      </StaggerItem>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}

          {/* Reply bar sticky */}
          <View style={styles.replyBar}>
            <View style={styles.replyInputWrap}>
              <TextInput
                value={reply}
                onChangeText={setReply}
                placeholder="Escrever resposta..."
                placeholderTextColor={textTokens.muted}
                multiline
                maxLength={5000}
                style={styles.replyInput}
                selectionColor={aurora.cyan}
              />
            </View>
            <PressableScale
              onPress={handleReply}
              disabled={createPost.isPending || reply.trim().length === 0}
              haptic="none"
              style={[
                styles.sendBtn,
                (createPost.isPending || reply.trim().length === 0) && {
                  opacity: 0.4,
                },
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

function ReplyBubble({
  post,
  isMe,
}: {
  post: { id: string; authorName: string; authorId: string; body: string; createdAt: string };
  isMe: boolean;
}) {
  return (
    <View style={[replyStyles.wrap, isMe && { alignItems: 'flex-end' }]}>
      {!isMe && (
        <View style={replyStyles.authorRow}>
          <View style={replyStyles.avatar}>
            <Text style={replyStyles.avatarText}>
              {post.authorName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={replyStyles.author}>{post.authorName}</Text>
        </View>
      )}
      <View
        style={[
          replyStyles.bubble,
          isMe && replyStyles.bubbleMe,
        ]}
      >
        {isMe && (
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Text
          style={[
            replyStyles.body,
            isMe && replyStyles.bodyMe,
          ]}
        >
          {post.body}
        </Text>
      </View>
      <Text style={replyStyles.time}>{timeAgo(post.createdAt)}</Text>
    </View>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - then) / 60000);
  if (diff < 1) return 'agora';
  if (diff < 60) return `${diff}m atrás`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h atrás`;
  return `${Math.floor(diff / 1440)}d atrás`;
}

const opStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
  },
  content: {
    padding: 16,
    zIndex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: 'Inter_900Black',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  opBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: premium.goldSoft,
    borderWidth: 1,
    borderColor: `${premium.gold}66`,
  },
  opBadgeText: {
    color: premium.goldLight,
    fontFamily: 'Inter_900Black',
    fontSize: 8,
    letterSpacing: 0.6,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: aurora.cyan,
    fontFamily: 'Inter_900Black',
    fontSize: 11,
  },
  author: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: textTokens.dim,
  },
  time: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  body: {
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.1,
  },
});

const replyStyles = StyleSheet.create({
  wrap: {
    maxWidth: '82%',
    alignSelf: 'flex-start',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    marginLeft: 8,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_900Black',
    fontSize: 9,
  },
  author: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
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

  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },

  noReplies: {
    alignItems: 'center',
    gap: 8,
  },
  noRepliesTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginTop: 4,
  },
  noRepliesText: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
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
