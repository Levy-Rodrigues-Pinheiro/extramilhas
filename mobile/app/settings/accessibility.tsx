import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/lib/ThemeProvider';
import {
  AuroraBackground,
  AuroraButton,
  SettingsGroup,
  SettingsRow,
  GlassCard,
  PressableScale,
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

export default function AccessibilityScreen() {
  const { t } = useTranslation();
  const {
    highContrast,
    fontScale,
    dyslexiaMode,
    setHighContrast,
    setFontScale,
    setDyslexiaMode,
    reset,
  } = useTheme();

  const presets = [
    { value: 0.85, label: 'A', size: 11 },
    { value: 1.0, label: 'A', size: 13 },
    { value: 1.15, label: 'A', size: 15 },
    { value: 1.35, label: 'A', size: 18 },
    { value: 1.6, label: 'A', size: 22 },
    { value: 1.85, label: 'A', size: 26 },
  ];

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Acessibilidade</Text>
            <Text style={styles.subtitle}>Texto, contraste, dislexia</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Font scale */}
          <Animated.View
            entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
          >
            <Text style={styles.sectionLabel}>TAMANHO DO TEXTO</Text>
            <GlassCard radiusSize="lg" padding={18}>
              {/* Preview */}
              <View style={styles.preview}>
                <Text
                  style={[
                    styles.previewText,
                    { fontSize: 14 * fontScale, lineHeight: 20 * fontScale },
                  ]}
                >
                  Este é um exemplo de texto pra você ver o tamanho escolhido.
                </Text>
              </View>

              <Text style={styles.scaleInfo}>
                Atual: <Text style={styles.scaleValue}>{Math.round(fontScale * 100)}%</Text>
              </Text>

              <View style={styles.presetRow}>
                {presets.map((p) => {
                  const active = fontScale === p.value;
                  return (
                    <PressableScale
                      key={p.value}
                      onPress={() => {
                        haptics.select();
                        setFontScale(p.value);
                      }}
                      haptic="none"
                      style={[styles.presetBtn, active && styles.presetBtnActive]}
                    >
                      {active && (
                        <LinearGradient
                          colors={gradients.auroraCyanMagenta}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[StyleSheet.absoluteFill, { borderRadius: 10 }]}
                        />
                      )}
                      <Text
                        style={[
                          styles.presetText,
                          { fontSize: p.size },
                          active && styles.presetTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Visual toggles */}
          <Animated.View entering={FadeInDown.delay(100).duration(motion.timing.medium)}>
            <SettingsGroup header="VISUAL" footer="Alto contraste aumenta a legibilidade. Modo dislexia usa fontes e espaçamento adaptados.">
              <SettingsRow
                icon="contrast"
                iconColor={aurora.cyan}
                iconBg={aurora.cyanSoft}
                label="Alto contraste"
                toggle={highContrast}
                onToggle={setHighContrast}
              />
              <SettingsRow
                icon="text"
                iconColor={semantic.success}
                iconBg={semantic.successBg}
                label="Modo dislexia"
                toggle={dyslexiaMode}
                onToggle={setDyslexiaMode}
              />
            </SettingsGroup>
          </Animated.View>

          {/* Reset */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(motion.timing.medium)}
            style={{ marginTop: space.md }}
          >
            <AuroraButton
              label="Restaurar padrões"
              onPress={() => {
                haptics.warning();
                Alert.alert(
                  'Restaurar padrões?',
                  'Seus ajustes de acessibilidade voltarão ao padrão.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Restaurar',
                      style: 'destructive',
                      onPress: () => {
                        haptics.heavy();
                        reset();
                      },
                    },
                  ],
                );
              }}
              variant="ghost"
              size="md"
              icon="refresh"
              iconPosition="left"
              fullWidth
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
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
    fontSize: 20,
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
  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: space.md,
  },
  preview: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: surface.glassBorder,
    marginBottom: 14,
  },
  previewText: {
    color: textTokens.primary,
    fontFamily: 'Inter_500Medium',
  },
  scaleInfo: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  scaleValue: {
    color: aurora.cyan,
    fontFamily: 'Inter_900Black',
    fontSize: 14,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: surface.glassBorder,
    backgroundColor: surface.glass,
    overflow: 'hidden',
  },
  presetBtnActive: {
    borderColor: 'transparent',
  },
  presetText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_700Bold',
  },
  presetTextActive: {
    color: '#041220',
    fontFamily: 'Inter_900Black',
  },
});
