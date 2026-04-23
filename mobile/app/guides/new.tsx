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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useCreateGuide, useSubmitGuide } from '../../src/hooks/useGuides';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
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

export default function NewGuideScreen() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const create = useCreateGuide();
  const submit = useSubmitGuide();

  const handleSaveAndSubmit = async () => {
    if (title.length < 5 || summary.length < 10 || body.length < 100) {
      haptics.error();
      Alert.alert('Dados inválidos', 'Título min 5, resumo min 10, corpo min 100 chars.');
      return;
    }
    try {
      haptics.medium();
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const draft = await create.mutateAsync({ title, summary, body, tags });
      await submit.mutateAsync(draft.id);
      haptics.success();
      Alert.alert(
        '✓ Enviado pra revisão',
        'Seu guia foi submetido. Admin analisa em até 48h e você recebe notificação quando publicar.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      haptics.error();
      Alert.alert(t('common.error'), e?.response?.data?.message || t('errors.generic'));
    }
  };

  const loading = create.isPending || submit.isPending;

  // Character count indicators
  const titleProgress = Math.min(100, (title.length / 80) * 100);
  const summaryProgress = Math.min(100, (summary.length / 200) * 100);
  const bodyProgress = Math.min(100, (body.length / 2000) * 100);

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <PressableScale
              onPress={() => router.back()}
              haptic="tap"
              style={styles.iconBtn}
            >
              <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
            </PressableScale>
            <View style={styles.titleBox}>
              <Text style={styles.title}>Novo guia</Text>
              <Text style={styles.subtitle}>Compartilhe com a comunidade</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Intro */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
            >
              <GlassCard radiusSize="lg" padding={14} glow="cyan">
                <View style={styles.introRow}>
                  <View style={styles.introIcon}>
                    <Ionicons name="bulb" size={18} color={aurora.cyan} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.introTitle}>Seu guia é revisado antes de publicar</Text>
                    <Text style={styles.introText}>
                      Admin analisa em até 48h. Você ganha reputação e ajuda toda a comunidade.
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Form */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(motion.timing.medium)}
              style={{ marginTop: space.md }}
            >
              <GlassCard radiusSize="lg" padding={16}>
                {/* Title */}
                <FieldWithCounter
                  label="Título do guia"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ex: Como combinar Livelo + Smiles em 2026"
                  maxLength={80}
                  min={5}
                  progress={titleProgress}
                  iconLeft="text-outline"
                />

                <View style={{ height: 16 }} />

                {/* Summary */}
                <FieldWithCounter
                  label="Resumo (aparece na lista)"
                  value={summary}
                  onChangeText={setSummary}
                  placeholder="1-2 frases sobre o que o guia ensina"
                  maxLength={200}
                  min={10}
                  progress={summaryProgress}
                  iconLeft="chatbox-outline"
                  multiline
                />

                <View style={{ height: 16 }} />

                {/* Body */}
                <View>
                  <View style={styles.bodyHeader}>
                    <Text style={styles.bodyLabel}>Conteúdo do guia</Text>
                    <Text style={styles.bodyCounter}>
                      {body.length} chars · min 100
                    </Text>
                  </View>
                  <View style={styles.bodyInputWrap}>
                    <TextInput
                      value={body}
                      onChangeText={setBody}
                      placeholder="Seu guia. Pode usar markdown básico (# título, ** negrito **, listas com -)."
                      placeholderTextColor={textTokens.muted}
                      multiline
                      numberOfLines={12}
                      style={styles.bodyInput}
                      selectionColor={aurora.cyan}
                    />
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${bodyProgress}%` }]} />
                  </View>
                </View>

                <View style={{ height: 16 }} />

                {/* Tags */}
                <FloatingLabelInput
                  label="Tags (separadas por vírgula)"
                  iconLeft="pricetag-outline"
                  value={tagsRaw}
                  onChangeText={setTagsRaw}
                  maxLength={100}
                />

                <View style={{ height: 6 }} />

                <AuroraButton
                  label="Enviar pra revisão"
                  onPress={handleSaveAndSubmit}
                  loading={loading}
                  disabled={title.length < 5 || summary.length < 10 || body.length < 100}
                  variant="primary"
                  size="lg"
                  icon="send"
                  iconPosition="right"
                  fullWidth
                  haptic="medium"
                />
              </GlassCard>
            </Animated.View>

            {/* Tips */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(motion.timing.medium)}
              style={{ marginTop: space.md }}
            >
              <GlassCard radiusSize="md" padding={12}>
                <Text style={styles.tipsTitle}>
                  <Ionicons name="sparkles" size={12} color={premium.goldLight} /> DICAS PRA
                  APROVAÇÃO RÁPIDA
                </Text>
                <View style={styles.tipsList}>
                  <TipLine text="Conte uma experiência pessoal específica" />
                  <TipLine text="Inclua números concretos (valor, % bônus, ROI)" />
                  <TipLine text="Descreva passos acionáveis, não só teoria" />
                  <TipLine text="Avise sobre pegadinhas ou pontos de atenção" />
                </View>
              </GlassCard>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

function FieldWithCounter({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  min,
  progress,
  iconLeft,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder: string;
  maxLength: number;
  min: number;
  progress: number;
  iconLeft: any;
  multiline?: boolean;
}) {
  const meetsMin = value.length >= min;

  return (
    <View>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text
          style={[
            styles.fieldCount,
            meetsMin && { color: semantic.success },
          ]}
        >
          {value.length}/{maxLength} · min {min}
        </Text>
      </View>
      <View
        style={[
          styles.fieldWrap,
          multiline && { minHeight: 64 },
          meetsMin && { borderColor: `${semantic.success}55` },
        ]}
      >
        <Ionicons
          name={iconLeft}
          size={16}
          color={meetsMin ? semantic.success : textTokens.muted}
          style={{ marginRight: 8, marginTop: multiline ? 4 : 0 }}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={textTokens.muted}
          multiline={multiline}
          maxLength={maxLength}
          style={[styles.fieldInput, multiline && { minHeight: 48, textAlignVertical: 'top' }]}
          selectionColor={aurora.cyan}
        />
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: meetsMin ? semantic.success : aurora.cyan,
            },
          ]}
        />
      </View>
    </View>
  );
}

function TipLine({ text }: { text: string }) {
  return (
    <View style={styles.tipLine}>
      <Ionicons name="checkmark-circle" size={12} color={semantic.success} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

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
    fontSize: 18,
    letterSpacing: -0.3,
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

  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  introIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: aurora.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${aurora.cyan}44`,
  },
  introTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  introText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },

  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  fieldLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  fieldCount: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
  },
  fieldInput: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    padding: 0,
    includeFontPadding: false,
  },

  bodyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  bodyLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  bodyCounter: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  bodyInputWrap: {
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    borderRadius: 14,
    padding: 12,
    minHeight: 140,
  },
  bodyInput: {
    color: textTokens.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 120,
    textAlignVertical: 'top',
  },

  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: surface.glass,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: aurora.cyan,
  },

  tipsTitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  tipsList: {
    gap: 6,
  },
  tipLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    flex: 1,
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
});
