import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useActiveSessions, useRevokeSession, ActiveSession } from '../src/hooks/useSessions';
import { EmptyState } from '../src/components/EmptyState';
import { Colors } from '../src/lib/theme';

const PLATFORM_ICON: Record<string, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  android: 'logo-android',
  ios: 'logo-apple',
  web: 'globe-outline',
};

export default function ActiveSessionsScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useActiveSessions();
  const revoke = useRevokeSession();

  const handleRevoke = (s: ActiveSession) => {
    Alert.alert(
      'Desconectar dispositivo',
      `Revogar acesso deste ${s.platform}? Ele vai parar de receber notificações push.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => revoke.mutate(s.id),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: ActiveSession }) => {
    const icon = PLATFORM_ICON[item.platform.toLowerCase()] || 'phone-portrait-outline';
    const lastUsed = new Date(item.lastUsedAt);
    const hoursAgo = Math.floor((Date.now() - lastUsed.getTime()) / 3600_000);
    const lastUsedLabel =
      hoursAgo < 1 ? 'há poucos minutos' : hoursAgo < 24 ? `${hoursAgo}h atrás` : `${Math.floor(hoursAgo / 24)}d atrás`;

    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={`${item.platform}${item.appVersion ? ' v' + item.appVersion : ''}, último acesso ${lastUsedLabel}`}
      >
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color={Colors.primary.light} />
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.platform}>{item.platform.toUpperCase()}</Text>
            {item.isRecent && <View style={styles.dot} />}
            {item.appVersion && <Text style={styles.version}>v{item.appVersion}</Text>}
          </View>
          <Text style={styles.meta}>Último acesso: {lastUsedLabel}</Text>
          <Text style={styles.meta}>Conectado há {item.ageDays}d</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleRevoke(item)}
          disabled={revoke.isPending}
          style={styles.revokeBtn}
          accessibilityRole="button"
          accessibilityLabel={`Desconectar ${item.platform}`}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close-circle-outline" size={22} color={Colors.red.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.active_sessions')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={Colors.primary.light} />
        </View>
      ) : isError ? (
        <EmptyState icon="alert-circle-outline" title={t('errors.generic')} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="phone-portrait-outline"
          title="Nenhum dispositivo"
          description="Conecte outros dispositivos pra recebê-los aqui."
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  platform: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green.primary,
  },
  version: { fontSize: 11, color: Colors.text.muted },
  meta: { fontSize: 11, color: Colors.text.secondary },
  revokeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
