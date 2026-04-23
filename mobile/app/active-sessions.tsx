import React from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  useActiveSessions,
  useRevokeSession,
  ActiveSession,
} from '../src/hooks/useSessions';
import {
  AuroraBackground,
  GlassCard,
  PressableScale,
  StaggerItem,
  SkeletonListItem,
  EmptyStateIllustrated,
  aurora,
  semantic,
  surface,
  text as textTokens,
  space,
  motion,
  haptics,
} from '../src/components/primitives';

const PLATFORM_ICON: Record<
  string,
  React.ComponentProps<typeof Ionicons>['name']
> = {
  android: 'logo-android',
  ios: 'logo-apple',
  web: 'globe-outline',
};

export default function ActiveSessionsScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useActiveSessions();
  const revoke = useRevokeSession();

  const handleRevoke = (s: ActiveSession) => {
    haptics.warning();
    Alert.alert(
      'Desconectar dispositivo',
      `Revogar acesso deste ${s.platform}? Ele vai parar de receber notificações.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => {
            haptics.heavy();
            revoke.mutate(s.id);
          },
        },
      ],
    );
  };

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
          </PressableScale>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Dispositivos conectados</Text>
            <Text style={styles.subtitle}>Revogue acesso quando quiser</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 10 }}>
            <SkeletonListItem />
            <SkeletonListItem />
          </View>
        ) : isError ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0} glow="danger">
              <EmptyStateIllustrated
                variant="radar"
                title="Erro ao carregar"
                description="Não foi possível carregar os dispositivos."
              />
            </GlassCard>
          </View>
        ) : !data || data.length === 0 ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="radar"
                title="Nenhuma sessão ativa"
                description="Seus dispositivos conectados aparecem aqui."
              />
            </GlassCard>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <StaggerItem index={index} baseDelay={80}>
                <SessionCard session={item} onRevoke={() => handleRevoke(item)} />
              </StaggerItem>
            )}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

function SessionCard({
  session,
  onRevoke,
}: {
  session: ActiveSession;
  onRevoke: () => void;
}) {
  const icon =
    PLATFORM_ICON[session.platform.toLowerCase()] || 'phone-portrait-outline';
  const lastUsed = new Date(session.lastUsedAt);
  const hoursAgo = Math.floor((Date.now() - lastUsed.getTime()) / 3600_000);
  const lastUsedLabel =
    hoursAgo < 1
      ? 'agora há pouco'
      : hoursAgo < 24
      ? `${hoursAgo}h atrás`
      : `${Math.floor(hoursAgo / 24)}d atrás`;

  return (
    <GlassCard
      radiusSize="lg"
      padding={14}
      glow={session.isRecent ? 'cyan' : 'none'}
    >
      <View style={cardStyles.row}>
        <View style={cardStyles.iconBox}>
          <Ionicons name={icon} size={22} color={aurora.cyan} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={cardStyles.titleRow}>
            <Text style={cardStyles.platform}>
              {session.platform.toUpperCase()}
            </Text>
            {session.isRecent && <View style={cardStyles.activeDot} />}
            {session.appVersion && (
              <Text style={cardStyles.version}>v{session.appVersion}</Text>
            )}
          </View>
          <Text style={cardStyles.meta}>
            <Ionicons name="time-outline" size={10} color={textTokens.muted} /> Último acesso:{' '}
            {lastUsedLabel}
          </Text>
          <Text style={cardStyles.meta}>
            <Ionicons name="calendar-outline" size={10} color={textTokens.muted} /> Conectado há{' '}
            {session.ageDays}d
          </Text>
        </View>

        <PressableScale onPress={onRevoke} haptic="none" style={cardStyles.revokeBtn}>
          <Ionicons name="close-circle" size={22} color={semantic.danger} />
        </PressableScale>
      </View>
    </GlassCard>
  );
}

const cardStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  platform: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: semantic.success,
    shadowColor: semantic.success,
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  version: {
    color: textTokens.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  meta: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  revokeBtn: {
    padding: 2,
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
    fontSize: 18,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 1,
  },
  list: {
    padding: space.md,
    paddingBottom: 120,
  },
});
