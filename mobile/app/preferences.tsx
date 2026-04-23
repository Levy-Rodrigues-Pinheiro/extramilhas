import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getContributeState, setContributeState } from '../src/lib/contribute-preference';
import {
  AuroraBackground,
  SettingsGroup,
  SettingsRow,
  GlassCard,
  PressableScale,
  ShimmerSkeleton,
  aurora,
  premium,
  semantic,
  surface,
  text as textTokens,
  space,
  motion,
  haptics,
} from '../src/components/primitives';

export default function PreferencesScreen() {
  const [contributing, setContributing] = useState<boolean | null>(null);

  useEffect(() => {
    getContributeState().then((s) => setContributing(s === 'accepted'));
  }, []);

  const toggle = async (next: boolean) => {
    setContributing(next);
    await setContributeState(next ? 'accepted' : 'declined');
  };

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Preferências</Text>
            <Text style={styles.subtitle}>Comportamento do app</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
          >
            <SettingsGroup
              header="COMUNIDADE"
              footer="Desligar não impede você de usar o app — só impede a captura de preços."
            >
              {contributing === null ? (
                <View style={{ padding: 14 }}>
                  <ShimmerSkeleton width="100%" height={20} radius="sm" />
                </View>
              ) : (
                <SettingsRow
                  icon="people"
                  iconColor={aurora.cyan}
                  iconBg={aurora.cyanSoft}
                  label="Compartilhar preços vistos"
                  toggle={contributing}
                  onToggle={toggle}
                />
              )}
            </SettingsGroup>
          </Animated.View>

          {/* Privacy breakdown */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(motion.timing.medium)}
            style={{ marginTop: space.sm }}
          >
            <Text style={styles.sectionLabel}>O QUE É CAPTURADO</Text>
            <GlassCard radiusSize="lg" padding={14}>
              <View style={styles.bulletsList}>
                <BulletLine
                  icon="checkmark-circle"
                  color={semantic.success}
                  bold="Capturado:"
                  text="milhas, tarifa, voo, horário — dados públicos visíveis na tela."
                />
                <BulletLine
                  icon="close-circle"
                  color={semantic.danger}
                  bold="Não capturado:"
                  text="login, saldo, histórico pessoal, cartão."
                />
                <BulletLine
                  icon="lock-closed"
                  color={aurora.iris}
                  bold="Privacidade:"
                  text="conexão usa SEU IP e cookies — igual pesquisando manualmente."
                />
              </View>
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

function BulletLine({
  icon,
  color,
  bold,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bold: string;
  text: string;
}) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name={icon} size={15} color={color} style={{ marginTop: 1 }} />
      <Text style={styles.bulletText}>
        <Text style={styles.bulletBold}>{bold}</Text> {text}
      </Text>
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
  bulletsList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletText: {
    flex: 1,
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  bulletBold: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
  },
});
