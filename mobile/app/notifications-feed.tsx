import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useNotificationFeed,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  InAppNotification,
} from '../src/hooks/useNotificationFeed';
import {
  AuroraBackground,
  GlassCard,
  PressableScale,
  StaggerItem,
  SkeletonListItem,
  EmptyStateIllustrated,
  aurora,
  premium,
  semantic,
  system,
  surface,
  text as textTokens,
  space,
  haptics,
} from '../src/components/primitives';

/**
 * Notification feed v2 — lista unificada + empty radar + row stagger.
 */
const ICON_BY_TYPE: Record<string, { icon: any; color: string; bgColor: string }> = {
  bonus_alert: { icon: 'gift', color: premium.goldLight, bgColor: premium.goldSoft },
  report_approved: { icon: 'trophy', color: semantic.success, bgColor: semantic.successBg },
  admin_review: { icon: 'shield-checkmark', color: aurora.magenta, bgColor: aurora.magentaSoft },
  offer_match: { icon: 'diamond', color: aurora.cyan, bgColor: aurora.cyanSoft },
  reactivation: { icon: 'hand-left', color: aurora.iris, bgColor: aurora.cyanSoft },
  default: { icon: 'notifications', color: textTokens.secondary, bgColor: surface.glass },
};

export default function NotificationsFeedScreen() {
  const { data, isLoading, isRefetching, refetch } = useNotificationFeed();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handlePress = (n: InAppNotification) => {
    haptics.tap();
    if (!n.isRead) markRead.mutate(n.id);
    const deepLink = n.data?.deepLink;
    if (typeof deepLink === 'string' && deepLink.startsWith('/')) {
      router.push(deepLink as any);
    }
  };

  const unread = data?.unreadCount ?? 0;

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
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
            <Text style={styles.title}>Notificações</Text>
            <Text style={styles.subtitle}>
              {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
            </Text>
          </View>
          {unread > 0 && (
            <PressableScale
              onPress={() => {
                haptics.medium();
                markAllRead.mutate();
              }}
              haptic="none"
              style={styles.markAllBtn}
            >
              <Ionicons name="checkmark-done" size={14} color={aurora.cyan} />
              <Text style={styles.markAllText}>Todas</Text>
            </PressableScale>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                haptics.medium();
                refetch();
              }}
              tintColor={aurora.cyan}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading && (
            <View style={{ gap: 10 }}>
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </View>
          )}

          {!isLoading && (data?.notifications?.length ?? 0) === 0 && (
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="radar"
                title="Nenhuma notificação ainda"
                description="Quando um bônus novo for aprovado ou seu alerta disparar, a gente te avisa aqui."
              />
            </GlassCard>
          )}

          {data?.notifications?.map((n, i) => {
            const meta = ICON_BY_TYPE[n.type] || ICON_BY_TYPE.default;
            return (
              <StaggerItem key={n.id} index={i} baseDelay={80}>
                <PressableScale
                  onPress={() => handlePress(n)}
                  haptic="none"
                  style={{ marginBottom: 8 }}
                >
                  <GlassCard
                    radiusSize="lg"
                    padding={12}
                    glow={!n.isRead ? 'cyan' : 'none'}
                    style={[rowStyles.row, n.isRead && { opacity: 0.75 }]}
                  >
                    {/* Icon */}
                    <View
                      style={[
                        rowStyles.iconWrap,
                        { backgroundColor: meta.bgColor, borderColor: `${meta.color}55` },
                      ]}
                    >
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                      {!n.isRead && <View style={rowStyles.dot} />}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          rowStyles.title,
                          n.isRead ? rowStyles.titleRead : rowStyles.titleUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {n.title}
                      </Text>
                      <Text style={rowStyles.body} numberOfLines={2}>
                        {n.body}
                      </Text>
                      <View style={rowStyles.metaRow}>
                        <Ionicons name="time-outline" size={10} color={textTokens.dim} />
                        <Text style={rowStyles.time}>{formatRelative(n.createdAt)}</Text>
                      </View>
                    </View>

                    {n.data?.deepLink && (
                      <Ionicons name="chevron-forward" size={16} color={textTokens.muted} />
                    )}
                  </GlassCard>
                </PressableScale>
              </StaggerItem>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: aurora.magenta,
    borderWidth: 2,
    borderColor: '#0A1020',
    shadowColor: aurora.magenta,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  titleRead: {
    color: textTokens.secondary,
    fontFamily: 'Inter_500Medium',
  },
  titleUnread: {
    color: textTokens.primary,
  },
  body: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  time: {
    color: textTokens.dim,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.2,
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
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: aurora.cyanSoft,
    borderWidth: 1,
    borderColor: `${aurora.cyan}44`,
  },
  markAllText: {
    color: aurora.cyan,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  content: {
    padding: space.md,
    paddingBottom: 120,
  },
});
