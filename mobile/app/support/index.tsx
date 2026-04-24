import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  useMyTickets,
  useCreateTicket,
  SupportTicket,
} from '../../src/hooks/useSupport';
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

const CATEGORIES = [
  { key: 'GENERAL', label: 'Geral', icon: 'help-circle-outline' as const },
  { key: 'BILLING', label: 'Pagamento', icon: 'card-outline' as const },
  { key: 'BUG', label: 'Bug', icon: 'bug-outline' as const },
  { key: 'FEATURE', label: 'Sugestão', icon: 'bulb-outline' as const },
  { key: 'ACCOUNT', label: 'Conta', icon: 'person-circle-outline' as const },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Aberto', color: aurora.cyan, bg: aurora.cyanSoft },
  AWAITING_USER: { label: 'Aguardando você', color: premium.goldLight, bg: premium.goldSoft },
  RESOLVED: { label: 'Resolvido', color: semantic.success, bg: semantic.successBg },
  CLOSED: { label: 'Fechado', color: textTokens.muted, bg: surface.glass },
};

export default function SupportListScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyTickets();
  const create = useCreateTicket();
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [body, setBody] = useState('');

  const handleCreate = async () => {
    if (subject.length < 5 || body.length < 10) {
      haptics.error();
      Alert.alert('Dados inválidos', 'Assunto min 5 chars, mensagem min 10 chars.');
      return;
    }
    try {
      haptics.medium();
      const res = await create.mutateAsync({
        subject: subject.trim(),
        category,
        body: body.trim(),
      });
      haptics.success();
      setModalOpen(false);
      setSubject('');
      setBody('');
      setCategory('GENERAL');
      router.push(`/support/${res.ticket.id}` as any);
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
            <Text style={styles.title}>Suporte</Text>
            <Text style={styles.subtitle}>Central de ajuda</Text>
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
            <Ionicons name="add" size={22} color="#041220" />
          </PressableScale>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 12 }}>
            <SkeletonCard />
          </View>
        ) : !data || data.length === 0 ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="search"
                title="Nenhum ticket aberto"
                description="Tem dúvida, problema ou sugestão? Abra um ticket que a gente responde."
                ctaLabel="Abrir ticket"
                onCtaPress={() => setModalOpen(true)}
              />
            </GlassCard>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <StaggerItem index={index} baseDelay={80}>
                <TicketCard ticket={item} />
              </StaggerItem>
            )}
            contentContainerStyle={styles.content}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}

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
                      <Text style={styles.modalTitle}>Novo ticket</Text>
                      <PressableScale
                        onPress={() => setModalOpen(false)}
                        haptic="tap"
                        style={styles.modalClose}
                      >
                        <Ionicons name="close" size={20} color={textTokens.secondary} />
                      </PressableScale>
                    </View>

                    <Text style={styles.fieldLabel}>CATEGORIA</Text>
                    <View style={styles.catRow}>
                      {CATEGORIES.map((c) => (
                        <PressableScale
                          key={c.key}
                          onPress={() => {
                            haptics.select();
                            setCategory(c.key);
                          }}
                          haptic="none"
                        >
                          <View
                            style={[
                              styles.catChip,
                              category === c.key && {
                                borderColor: aurora.cyan,
                                backgroundColor: aurora.cyanSoft,
                              },
                            ]}
                          >
                            <Ionicons
                              name={c.icon}
                              size={13}
                              color={category === c.key ? aurora.cyan : textTokens.muted}
                            />
                            <Text
                              style={[
                                styles.catText,
                                category === c.key && { color: aurora.cyan, fontFamily: 'Inter_700Bold' },
                              ]}
                            >
                              {c.label}
                            </Text>
                          </View>
                        </PressableScale>
                      ))}
                    </View>

                    <FloatingLabelInput
                      label="Assunto"
                      iconLeft="text-outline"
                      value={subject}
                      onChangeText={setSubject}
                      maxLength={100}
                    />

                    <Text style={styles.fieldLabel}>MENSAGEM</Text>
                    <View style={styles.bodyWrap}>
                      <TextInput
                        value={body}
                        onChangeText={setBody}
                        placeholder="Descreva com detalhes..."
                        placeholderTextColor={textTokens.muted}
                        multiline
                        maxLength={5000}
                        style={styles.bodyInput}
                        selectionColor={aurora.cyan}
                      />
                    </View>

                    <AuroraButton
                      label="Enviar ticket"
                      onPress={handleCreate}
                      loading={create.isPending}
                      disabled={subject.length < 5 || body.length < 10}
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

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const meta = STATUS_META[ticket.status] ?? STATUS_META.OPEN;

  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        router.push(`/support/${ticket.id}` as any);
      }}
      haptic="none"
    >
      <GlassCard
        radiusSize="lg"
        padding={14}
        glow={ticket.status === 'AWAITING_USER' ? 'gold' : 'none'}
      >
        <View style={cardStyles.headerRow}>
          <View
            style={[
              cardStyles.statusChip,
              { backgroundColor: meta.bg, borderColor: `${meta.color}55` },
            ]}
          >
            <View style={[cardStyles.statusDot, { backgroundColor: meta.color }]} />
            <Text style={[cardStyles.statusText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
          <Text style={cardStyles.date}>
            {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
          </Text>
        </View>

        <Text style={cardStyles.subject} numberOfLines={2}>
          {ticket.subject}
        </Text>

        <View style={cardStyles.footer}>
          <View style={cardStyles.footerItem}>
            <Ionicons name="chatbubbles-outline" size={12} color={textTokens.muted} />
            <Text style={cardStyles.footerText}>{(ticket as any).messageCount ?? 0}</Text>
          </View>
          <Text style={cardStyles.category}>#{ticket.category}</Text>
        </View>
      </GlassCard>
    </PressableScale>
  );
}

const cardStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  date: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  subject: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  category: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
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
  fieldLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: space.md,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
  },
  catText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
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
});
