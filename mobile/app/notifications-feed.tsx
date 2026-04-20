import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
import { SkeletonCard } from '../src/components/Skeleton';

/**
 * Notification Center — histórico in-app de pushes recebidas.
 * User pode rever, marcar como lida, ou seguir o deepLink se existe.
 */
const ICON_BY_TYPE: Record<string, { emoji: string; color: string }> = {
  bonus_alert: { emoji: '🎁', color: '#F59E0B' },
  report_approved: { emoji: '🏆', color: '#10B981' },
  admin_review: { emoji: '🔔', color: '#8B5CF6' },
  offer_match: { emoji: '💎', color: '#3B82F6' },
  reactivation: { emoji: '👋', color: '#EC4899' },
  default: { emoji: '📬', color: '#94A3B8' },
};

export default function NotificationsFeedScreen() {
  const { data, isLoading, isRefetching, refetch } = useNotificationFeed();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handlePress = (n: InAppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const deepLink = n.data?.deepLink;
    if (typeof deepLink === 'string' && deepLink.startsWith('/')) {
      router.push(deepLink as any);
    }
  };

  const unread = data?.unreadCount ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Notificações</Text>
          <Text style={styles.subtitle}>
            {unread > 0 ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
          </Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity
            onPress={() => markAllRead.mutate()}
            style={styles.markAllBtn}
          >
            <Text style={styles.markAllText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#8B5CF6" />
        }
      >
        {isLoading && (
          <View>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        )}

        {!isLoading && (data?.notifications?.length ?? 0) === 0 && (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>Nenhuma notificação ainda</Text>
            <Text style={styles.emptyText}>
              Quando um bônus novo for aprovado, a gente te avisa aqui.
            </Text>
          </View>
        )}

        {data?.notifications?.map((n) => {
          const meta = ICON_BY_TYPE[n.type] || ICON_BY_TYPE.default;
          return (
            <TouchableOpacity
              key={n.id}
              onPress={() => handlePress(n)}
              activeOpacity={0.7}
              style={[styles.card, !n.isRead && styles.cardUnread]}
            >
              <View style={styles.iconWrap}>
                <Text style={styles.emoji}>{meta.emoji}</Text>
                {!n.isRead && <View style={styles.unreadDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, !n.isRead && styles.cardTitleUnread]}>
                  {n.title}
                </Text>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {n.body}
                </Text>
                <Text style={styles.cardTime}>{formatRelative(n.createdAt)}</Text>
              </View>
              {n.data?.deepLink && (
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 8, width: 40 },
  titleBox: { flex: 1 },
  title: { color: '#fff', fontSize: 19, fontWeight: '700' },
  subtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },

  content: { padding: 12, paddingBottom: 40 },
  empty: {
    alignItems: 'center', padding: 40, gap: 10,
    marginTop: 40,
  },
  emptyTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '700', marginTop: 4 },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 18 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 10,
    marginBottom: 8,
  },
  cardUnread: { borderColor: '#8B5CF6', backgroundColor: '#1E1B4B' },
  iconWrap: { position: 'relative' },
  emoji: { fontSize: 28 },
  unreadDot: {
    position: 'absolute', top: 0, right: -4,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#EC4899',
    borderWidth: 2, borderColor: '#1E1B4B',
  },
  cardTitle: { color: '#CBD5E1', fontSize: 14, fontWeight: '600' },
  cardTitleUnread: { color: '#F1F5F9', fontWeight: '700' },
  cardBody: { color: '#94A3B8', fontSize: 12, marginTop: 3, lineHeight: 16 },
  cardTime: { color: '#64748B', fontSize: 11, marginTop: 6 },
});
