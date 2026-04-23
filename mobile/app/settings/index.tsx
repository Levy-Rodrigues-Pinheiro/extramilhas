import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/lib/ThemeProvider';
import {
  AuroraBackground,
  SettingsGroup,
  SettingsRow,
  PressableScale,
  aurora,
  premium,
  semantic,
  surface,
  text as textTokens,
  space,
  motion,
  haptics,
} from '../../src/components/primitives';

/**
 * Settings hub v2 — iOS grouped list Apple-native.
 */
export default function SettingsIndexScreen() {
  const { t } = useTranslation();
  const { mode, highContrast, fontScale, dyslexiaMode } = useTheme();

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale
            onPress={() => router.back()}
            haptic="tap"
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Configurações</Text>
            <Text style={styles.subtitle}>Tema, acessibilidade, privacidade</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
          >
            <SettingsGroup header="APARÊNCIA">
              <SettingsRow
                icon="color-palette"
                iconColor={aurora.magenta}
                iconBg={aurora.magentaSoft}
                label="Tema"
                trailing={mode === 'dark' ? 'Escuro' : mode === 'light' ? 'Claro' : 'Sistema'}
                onPress={() => router.push('/settings/theme' as any)}
              />
              <SettingsRow
                icon="accessibility"
                iconColor={semantic.success}
                iconBg={semantic.successBg}
                label="Acessibilidade"
                trailing={`${Math.round(fontScale * 100)}%${highContrast ? ' · Alto' : ''}${
                  dyslexiaMode ? ' · Dislexia' : ''
                }`}
                onPress={() => router.push('/settings/accessibility' as any)}
              />
            </SettingsGroup>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(80).duration(motion.timing.medium)}
          >
            <SettingsGroup header="NOTIFICAÇÕES E ALERTAS">
              <SettingsRow
                icon="notifications"
                iconColor={aurora.cyan}
                iconBg={aurora.cyanSoft}
                label="Notificações"
                trailing="Push, WhatsApp, email"
                onPress={() => router.push('/notification-settings' as any)}
              />
            </SettingsGroup>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(160).duration(motion.timing.medium)}
          >
            <SettingsGroup header="CONTA E PRIVACIDADE">
              <SettingsRow
                icon="shield-checkmark"
                iconColor={semantic.success}
                iconBg={semantic.successBg}
                label="Segurança"
                trailing="2FA, sessões"
                onPress={() => router.push('/security' as any)}
              />
              <SettingsRow
                icon="options"
                iconColor={premium.goldLight}
                iconBg={premium.goldSoft}
                label="Preferências"
                trailing="Programas, CPM alvo"
                onPress={() => router.push('/preferences' as any)}
              />
              <SettingsRow
                icon="create"
                iconColor={aurora.iris}
                iconBg={aurora.cyanSoft}
                label="Editar perfil"
                onPress={() => router.push('/edit-profile' as any)}
              />
            </SettingsGroup>
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
});
