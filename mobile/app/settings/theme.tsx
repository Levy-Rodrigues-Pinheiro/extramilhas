import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/lib/ThemeProvider';
import { ACCENT_OPTIONS, type AccentColor, type ThemeMode } from '../../src/lib/themes';
import {
  AuroraBackground,
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

export default function ThemeSettingsScreen() {
  const { t } = useTranslation();
  const { mode, accent, setMode, setAccent } = useTheme();

  const modes: Array<{
    key: ThemeMode;
    label: string;
    desc: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    bg: string;
  }> = [
    {
      key: 'dark',
      label: 'Escuro',
      desc: 'Ideal pra leitura noturna',
      icon: 'moon',
      color: aurora.iris,
      bg: aurora.cyanSoft,
    },
    {
      key: 'light',
      label: 'Claro',
      desc: 'Em breve',
      icon: 'sunny',
      color: premium.goldLight,
      bg: premium.goldSoft,
    },
    {
      key: 'system',
      label: 'Seguir sistema',
      desc: 'Muda junto com iOS/Android',
      icon: 'phone-portrait',
      color: aurora.cyan,
      bg: aurora.cyanSoft,
    },
  ];

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Aparência</Text>
            <Text style={styles.subtitle}>Tema e cor de destaque</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Modes */}
          <Animated.View
            entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
          >
            <SettingsGroup header="MODO">
              {modes.map((m) => (
                <SettingsRow
                  key={m.key}
                  icon={m.icon}
                  iconColor={m.color}
                  iconBg={m.bg}
                  label={m.label}
                  onPress={() => {
                    haptics.select();
                    setMode(m.key);
                  }}
                  trailingCustom={
                    mode === m.key ? (
                      <Ionicons name="checkmark" size={18} color={semantic.success} />
                    ) : null
                  }
                  showChevron={false}
                />
              ))}
            </SettingsGroup>
          </Animated.View>

          {/* Accent */}
          <Animated.View entering={FadeInDown.delay(100).duration(motion.timing.medium)}>
            <Text style={styles.sectionLabel}>COR DE DESTAQUE</Text>
            <GlassCard radiusSize="lg" padding={14}>
              <Text style={styles.note}>
                Define a cor principal dos botões e acentos do app.
              </Text>
              <View style={styles.grid}>
                <AccentSwatch
                  color="aurora"
                  gradient
                  selected={!accent}
                  onPress={() => {
                    haptics.select();
                    setAccent(null);
                  }}
                  label="Aurora"
                />
                {ACCENT_OPTIONS.map((c) => (
                  <AccentSwatch
                    key={c}
                    color={c}
                    selected={accent === c}
                    onPress={() => {
                      haptics.select();
                      setAccent(c as AccentColor);
                    }}
                  />
                ))}
              </View>
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

function AccentSwatch({
  color,
  gradient,
  selected,
  onPress,
  label,
}: {
  color: string;
  gradient?: boolean;
  selected: boolean;
  onPress: () => void;
  label?: string;
}) {
  return (
    <PressableScale onPress={onPress} haptic="none" style={swatchStyles.wrap}>
      <View style={[swatchStyles.outer, selected && swatchStyles.outerSelected]}>
        {gradient ? (
          <LinearGradient
            colors={gradients.auroraCyanMagenta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={swatchStyles.inner}
          />
        ) : (
          <View style={[swatchStyles.inner, { backgroundColor: color }]} />
        )}
        {selected && (
          <View style={swatchStyles.checkmarkWrap}>
            <Ionicons name="checkmark" size={14} color="#FFF" />
          </View>
        )}
      </View>
      {label && <Text style={swatchStyles.label}>{label}</Text>}
    </PressableScale>
  );
}

const swatchStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  outer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    position: 'relative',
  },
  outerSelected: {
    borderColor: '#FFF',
  },
  inner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  checkmarkWrap: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A1020',
  },
  label: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 0.4,
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
  note: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
});
