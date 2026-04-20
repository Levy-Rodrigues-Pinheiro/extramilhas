import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useDashboardStats, useExportCsv } from '../src/hooks/useDashboard';
import { Colors, Gradients } from '../src/lib/theme';

/**
 * Dashboard pessoal do user — stats de uso e economia estimada.
 * Export: dispara mutação que baixa CSV do backend (LGPD-ready) e usa
 * Share.share com o conteúdo inline (pra não precisar de expo-sharing).
 */
export default function DashboardScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useDashboardStats();
  const exportCsv = useExportCsv();

  const handleExport = async () => {
    try {
      const result = await exportCsv.mutateAsync();
      await Share.share({
        title: result.filename,
        message: result.csv,
      });
    } catch {
      Alert.alert(t('common.error'), t('errors.generic'));
    }
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
        <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary.light} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('errors.generic')}</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.try_again')}
          >
            <Text style={styles.retryText}>{t('common.try_again')}</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero: economia estimada */}
          <LinearGradient
            colors={['#10B981', '#3B82F6']}
            style={styles.hero}
          >
            <Text style={styles.heroLabel}>{t('dashboard.savings_total')}</Text>
            <Text style={styles.heroValue}>
              R$ {data.savingsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.heroNote}>{data.savingsEstimateNote}</Text>
          </LinearGradient>

          {/* Grid de stats */}
          <View style={styles.grid}>
            <StatCard
              icon="notifications"
              label={t('dashboard.alerts_count')}
              value={String(data.notifications.total)}
              sub={t('dashboard.savings_last_month') + `: ${data.notifications.lastMonth}`}
            />
            <StatCard
              icon="alarm-outline"
              label={t('alerts_screen.title')}
              value={String(data.alertsConfigured)}
              sub={data.alertsConfigured > 0 ? t('alerts_screen.active') : ''}
            />
            <StatCard
              icon="trophy-outline"
              label={t('missions.title')}
              value={String(data.missionsCompleted)}
              sub={t('missions.progress', { current: data.missionsCompleted, target: data.missionsCompleted })}
            />
            <StatCard
              icon="wallet-outline"
              label={t('wallet.total_miles')}
              value={data.walletTotalMiles.toLocaleString('pt-BR')}
              sub={t('home.programs_count', { count: data.walletPrograms })}
            />
          </View>

          {/* Export */}
          <View style={styles.exportBox}>
            <Text style={styles.exportTitle}>{t('profile.export_data')}</Text>
            <Text style={styles.exportText}>
              Formato CSV com carteira, alertas, família e notificações.
            </Text>
            <TouchableOpacity
              onPress={handleExport}
              disabled={exportCsv.isPending}
              style={styles.exportBtn}
              accessibilityRole="button"
              accessibilityLabel={t('dashboard.export_csv')}
            >
              <LinearGradient
                colors={Gradients.primary as unknown as readonly [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.exportBtnGradient}
              >
                {exportCsv.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={16} color="#fff" />
                    <Text style={styles.exportBtnText}>{t('dashboard.export_csv')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Gerado em {new Date(data.generatedAt).toLocaleString('pt-BR')}
          </Text>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View
      style={styles.statCard}
      accessible
      accessibilityLabel={`${label}: ${value}${sub ? `. ${sub}` : ''}`}
    >
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary.light} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { color: Colors.text.secondary, marginBottom: 12 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  retryText: { color: Colors.primary.light, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  heroLabel: { color: '#fff', opacity: 0.85, fontSize: 13, fontWeight: '600' },
  heroValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    marginVertical: 4,
  },
  heroNote: { color: '#fff', opacity: 0.75, fontSize: 11, lineHeight: 15 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statSub: {
    fontSize: 10,
    color: Colors.text.muted,
    marginTop: 2,
  },
  exportBox: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 12,
  },
  exportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  exportText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  exportBtn: {},
  exportBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    fontSize: 11,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
});
