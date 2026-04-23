import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  motion,
  haptics,
} from '../src/components/primitives';

export default function SecurityScreen() {
  const { t } = useTranslation();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const bio = await AsyncStorage.getItem('sec-pref-biometrics');
        const twofa = await AsyncStorage.getItem('sec-pref-2fa');
        if (bio === '1') setBiometricsEnabled(true);
        if (twofa === '1') setTwoFactorEnabled(true);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const toggleBiometrics = async (v: boolean) => {
    if (v) {
      haptics.warning();
      Alert.alert(
        t('profile.biometrics'),
        'Esta versão ainda não tem login por biometria compilado. A preferência fica salva e ativa quando a próxima versão estiver disponível.',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: 'Salvar preferência',
            onPress: async () => {
              haptics.success();
              await AsyncStorage.setItem('sec-pref-biometrics', '1');
              setBiometricsEnabled(true);
            },
          },
        ],
      );
    } else {
      await AsyncStorage.removeItem('sec-pref-biometrics');
      setBiometricsEnabled(false);
    }
  };

  const toggle2FA = async (v: boolean) => {
    if (v) {
      haptics.warning();
      Alert.alert(
        t('profile.two_factor'),
        'Verificação em 2 etapas via app autenticador virá em breve. Salvar preferência pra receber notificação quando estiver disponível?',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: 'Me avise',
            onPress: async () => {
              haptics.success();
              await AsyncStorage.setItem('sec-pref-2fa', '1');
              setTwoFactorEnabled(true);
            },
          },
        ],
      );
    } else {
      await AsyncStorage.removeItem('sec-pref-2fa');
      setTwoFactorEnabled(false);
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
            <Text style={styles.title}>Segurança</Text>
            <Text style={styles.subtitle}>Biometria, 2FA, sessões</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero info */}
          <Animated.View
            entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
          >
            <GlassCard radiusSize="lg" padding={16} glow="success">
              <View style={styles.heroRow}>
                <View style={styles.heroIcon}>
                  <Ionicons name="shield-checkmark" size={22} color={semantic.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>Sua conta está protegida</Text>
                  <Text style={styles.heroText}>
                    Login JWT com refresh token + pushes só pro seu device.
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Methods */}
          <Animated.View entering={FadeInDown.delay(80).duration(motion.timing.medium)}>
            <SettingsGroup
              header="AUTENTICAÇÃO"
              footer="Biometria e 2FA chegam em breve. Suas preferências ficam salvas pra ativação automática."
            >
              <SettingsRow
                icon="finger-print"
                iconColor={aurora.cyan}
                iconBg={aurora.cyanSoft}
                label="Login por biometria"
                toggle={biometricsEnabled}
                onToggle={toggleBiometrics}
              />
              <SettingsRow
                icon="key"
                iconColor={premium.goldLight}
                iconBg={premium.goldSoft}
                label="Verificação em 2 etapas"
                toggle={twoFactorEnabled}
                onToggle={toggle2FA}
              />
            </SettingsGroup>
          </Animated.View>

          {/* Sessions */}
          <Animated.View entering={FadeInDown.delay(160).duration(motion.timing.medium)}>
            <SettingsGroup header="DEVICES">
              <SettingsRow
                icon="phone-portrait"
                iconColor={aurora.magenta}
                iconBg={aurora.magentaSoft}
                label="Dispositivos conectados"
                trailing="Ver todos"
                onPress={() => router.push('/active-sessions' as any)}
              />
              <SettingsRow
                icon="refresh"
                iconColor={aurora.iris}
                iconBg={aurora.cyanSoft}
                label="Trocar senha"
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

  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: semantic.successBg,
    borderWidth: 1,
    borderColor: `${semantic.success}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  heroText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
});
