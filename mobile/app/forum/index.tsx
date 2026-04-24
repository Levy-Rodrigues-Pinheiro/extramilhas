import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  useForumThreads,
  useCreateThread,
  ForumThread,
  usePolls,
  useVotePoll,
} from '../../src/hooks/useCommunity';
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
} from '../../src/components/primitives';

const TAGS = ['GERAL', 'ROTA', 'PROGRAMA', 'DUVIDA', 'BONUS'];
const TAG_COLORS: Record<string, string> = {
  GERAL: aurora.cyan,
  ROTA: semantic.success,
  PROGRAMA: aurora.magenta,
  DUVIDA: premium.goldLight,
  BONUS: aurora.iris,
};

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
      haptics.error();
      Alert.alert('Dados inválidos', 'Título min 3 chars, corpo min 10 chars.');
      return;
    }
    try {
      haptics.medium();
      await create.mutateAsync({ title: title.trim(), body: body.trim(), tag: newTag });
      haptics.success();
      setModalOpen(false);
      setTitle('');
      setBody('');
      setNewTag('GERAL');
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Fórum</Text>
            <Text style={styles.subtitle}>Discussões da comunidade</Text>
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
            <Ionicons name="create" size={20} color="#041220" />
          </PressableScale>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <FlatList
            data={data?.items ?? []}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <View>
                {/* Tag filter */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tagsScroll}
                >
                  <TagChip
                    label="Todos"
                    active={!selectedTag}
                    onPress={() => setSelectedTag(undefined)}
                  />
                  {TAGS.map((tag) => (
                    <TagChip
                      key={tag}
                      label={tag}
                      color={TAG_COLORS[tag]}
                      active={selectedTag === tag}
                      onPress={() => setSelectedTag(tag)}
                    />
                  ))}
                </ScrollView>

                {/* Polls */}
                {polls && polls.length > 0 && (
                  <Animated.View
                    entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
                    style={{ marginBottom: space.md }}
                  >
                    <Text style={styles.sectionLabel}>ENQUETE ATIVA</Text>
                    {polls.slice(0, 1).map((p: any) => (
                      <PollCard
                        key={p.id}
                        poll={p}
                        onVote={(opId) => {
                          haptics.medium();
                          vote.mutate({ pollId: p.id, optionId: opId });
                        }}
                      />
                    ))}
                  </Animated.View>
                )}

                <Text style={styles.sectionLabel}>THREADS</Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <StaggerItem index={index} baseDelay={80}>
                <ThreadCard thread={item} />
              </StaggerItem>
            )}
            ListEmptyComponent={
              <GlassCard radiusSize="xl" padding={0}>
                <EmptyStateIllustrated
                  variant="search"
                  title={selectedTag ? `Nenhuma thread em #${selectedTag}` : 'Nenhuma thread'}
                  description="Seja o primeiro a começar uma discussão."
                  ctaLabel="Nova thread"
                  onCtaPress={() => setModalOpen(true)}
                />
              </GlassCard>
            }
            contentContainerStyle={styles.content}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* New thread modal */}
        {modalOpen && (
          <Modal visible animationType="none" transparent>
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
                      <Text style={styles.modalTitle}>Nova thread</Text>
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
                      iconLeft="text-outline"
                      value={title}
                      onChangeText={setTitle}
                      maxLength={120}
                    />

                    <Text style={styles.fieldLabel}>Conteúdo</Text>
                    <View style={styles.bodyWrap}>
                      <TextInput
                        value={body}
                        onChangeText={setBody}
                        placeholder="Compartilhe sua experiência, dúvida ou dica..."
                        placeholderTextColor={textTokens.muted}
                        multiline
                        maxLength={2000}
                        style={styles.bodyInput}
                        selectionColor={aurora.cyan}
                      />
                    </View>

                    <Text style={styles.fieldLabel}>Tag</Text>
                    <View style={styles.tagRow}>
                      {TAGS.map((tag) => (
                        <TagChip
                          key={tag}
                          label={tag}
                          color={TAG_COLORS[tag]}
                          active={newTag === tag}
                          onPress={() => setNewTag(tag)}
                        />
                      ))}
                    </View>

                    <AuroraButton
                      label="Publicar"
                      onPress={handleCreate}
                      loading={create.isPending}
                      disabled={title.length < 3 || body.length < 10}
                      variant="primary"
                      size="lg"
                      icon="send"
                      iconPosition="right"
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

function TagChip({
  label,
  color,
  active,
  onPress,
}: {
  label: string;
  color?: string;
  active: boolean;
  onPress: () => void;
}) {
  const c = color ?? aurora.cyan;
  return (
    <PressableScale
      onPress={() => {
        haptics.select();
        onPress();
      }}
      haptic="none"
    >
      <View
        style={[
          styles.tagChip,
          active && {
            borderColor: c,
            backgroundColor: `${c}1F`,
          },
        ]}
      >
        <Text
          style={[
            styles.tagText,
            active && { color: c, fontFamily: 'Inter_700Bold' },
          ]}
        >
          #{label}
        </Text>
      </View>
    </PressableScale>
  );
}

function PollCard({ poll, onVote }: { poll: any; onVote: (id: string) => void }) {
  return (
    <GlassCard radiusSize="lg" padding={16} glow="magenta">
      <View style={pollStyles.header}>
        <Ionicons name="bar-chart" size={16} color={aurora.magenta} />
        <Text style={pollStyles.question}>{poll.question}</Text>
      </View>
      <View style={{ gap: 6, marginTop: 12 }}>
        {poll.options.map((o: any) => {
          const pct = poll.totalVotes > 0 ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
          return (
            <PressableScale
              key={o.id}
              onPress={() => onVote(o.id)}
              haptic="none"
            >
              <View style={pollStyles.option}>
                <View style={[pollStyles.fill, { width: `${pct}%` }]}>
                  <LinearGradient
                    colors={[`${aurora.cyan}CC`, aurora.magenta]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
                <Text style={pollStyles.label}>{o.label}</Text>
                <Text style={pollStyles.pct}>{pct}%</Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
      <Text style={pollStyles.total}>{poll.totalVotes} votos</Text>
    </GlassCard>
  );
}

function ThreadCard({ thread }: { thread: ForumThread }) {
  const tagColor = TAG_COLORS[thread.tag] ?? textTokens.muted;

  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        router.push(`/forum/${thread.id}` as any);
      }}
      haptic="none"
    >
      <GlassCard radiusSize="lg" padding={14}>
        <View style={threadStyles.metaRow}>
          <View
            style={[
              threadStyles.tagChip,
              { backgroundColor: `${tagColor}1F`, borderColor: `${tagColor}55` },
            ]}
          >
            <Text style={[threadStyles.tagText, { color: tagColor }]}>
              #{thread.tag}
            </Text>
          </View>
          <View style={threadStyles.authorRow}>
            <View style={threadStyles.avatar}>
              <Text style={threadStyles.avatarText}>
                {thread.authorName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={threadStyles.author}>{thread.authorName}</Text>
          </View>
        </View>
        <Text style={threadStyles.title} numberOfLines={2}>
          {thread.title}
        </Text>
        <Text style={threadStyles.body} numberOfLines={2}>
          {thread.body}
        </Text>
        <View style={threadStyles.footer}>
          <View style={threadStyles.footerItem}>
            <Ionicons name="chatbubble-outline" size={12} color={textTokens.muted} />
            <Text style={threadStyles.footerText}>{thread.replyCount}</Text>
          </View>
          <View style={threadStyles.footerItem}>
            <Ionicons name="time-outline" size={12} color={textTokens.muted} />
            <Text style={threadStyles.footerText}>
              {formatRelative(thread.createdAt)}
            </Text>
          </View>
        </View>
      </GlassCard>
    </PressableScale>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
  return `${Math.floor(diffMin / 1440)}d`;
}

const pollStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  question: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  option: {
    height: 40,
    borderRadius: 10,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    opacity: 0.26,
  },
  label: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    zIndex: 1,
  },
  pct: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    zIndex: 1,
  },
  total: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 10,
    textAlign: 'right',
  },
});

const threadStyles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}44`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: aurora.cyan,
    fontFamily: 'Inter_900Black',
    fontSize: 10,
  },
  author: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  body: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: surface.glassBorder,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
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
  },
  content: {
    padding: space.md,
    paddingBottom: 120,
  },
  tagsScroll: {
    gap: 8,
    paddingVertical: 4,
    marginBottom: space.md,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
  },
  tagText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
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
  fieldLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bodyWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    padding: 12,
    marginBottom: 16,
    minHeight: 100,
  },
  bodyInput: {
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
});
