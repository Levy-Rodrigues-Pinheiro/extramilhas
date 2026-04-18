import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAlerts, useToggleAlert, useDeleteAlert } from '../../src/hooks/useAlerts';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/lib/theme';
import type { Alert as AlertType, AlertType as AlertTypeEnum } from '../../src/types';

type IoniconName = keyof typeof Ionicons.glyphMap;

const ALERT_TYPE_CONFIG: Record<
  AlertTypeEnum,
  { icon: IoniconName; label: string; color: string }
> = {
  CPM_THRESHOLD: { icon: 'trending-down-outline', label: 'Limite de CPM', color: '#818CF8' },
  DESTINATION: { icon: 'map-outline', label: 'Destino Específico', color: '#22c55e' },
  PROGRAM_PROMO: { icon: 'flash-outline', label: 'Promoção de Programa', color: '#eab308' },
};

const CABIN_CLASS_LABELS: Record<string, string> = {
  ECONOMY: 'Econômica',
  BUSINESS: 'Executiva',
  FIRST: 'Primeira',
};

function buildConditionSummary(alert: AlertType): string {
  const { type, condition } = alert;

  if (type === 'CPM_THRESHOLD') {
    const parts: string[] = [];
    if (condition.programId) parts.push(`Programa selecionado`);
    if (condition.maxCpm !== undefined) parts.push(`CPM ≤ R$${condition.maxCpm}/1.000`);
    return parts.join(' · ') || 'Alerta de CPM';
  }

  if (type === 'DESTINATION') {
    const parts: string[] = [];
    if (condition.origin) parts.push(`De: ${condition.origin}`);
    if (condition.destination) parts.push(`Para: ${condition.destination}`);
    if (condition.cabinClass) parts.push(CABIN_CLASS_LABELS[condition.cabinClass] ?? condition.cabinClass);
    if (condition.maxMiles !== undefined) parts.push(`≤ ${condition.maxMiles.toLocaleString('pt-BR')} mi`);
    return parts.join(' · ') || 'Alerta de destino';
  }

  if (type === 'PROGRAM_PROMO') {
    return condition.programId ? 'Promoção de programa' : 'Qualquer promoção';
  }

  return 'Alerta configurado';
}

function AlertCard({ alert }: { alert: AlertType }) {
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();
  const config = ALERT_TYPE_CONFIG[alert.type];

  const handleDelete = () => {
    Alert.alert(
      'Excluir alerta',
      'Tem certeza que deseja excluir este alerta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteAlert.mutate(alert.id),
        },
      ]
    );
  };

  const handleToggle = (value: boolean) => {
    toggleAlert.mutate({ id: alert.id, isActive: value });
  };

  return (
    <View style={styles.alertCard}>
      <View style={[styles.alertIconContainer, { backgroundColor: `${config.color}20` }]}>
        <Ionicons name={config.icon} size={22} color={config.color} />
      </View>
      <View style={styles.alertInfo}>
        <Text style={styles.alertTypeLabel}>{config.label}</Text>
        <Text style={styles.alertCondition} numberOfLines={2}>
          {buildConditionSummary(alert)}
        </Text>
        {alert.lastTriggeredAt && (
          <Text style={styles.alertLastTriggered}>
            Disparado em: {new Date(alert.lastTriggeredAt).toLocaleDateString('pt-BR')}
          </Text>
        )}
        <View style={styles.alertChannels}>
          {alert.channels.map((channel) => (
            <View key={channel} style={styles.channelChip}>
              <Text style={styles.channelChipText}>
                {channel === 'PUSH' ? 'Push' : channel === 'EMAIL' ? 'E-mail' : 'App'}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.alertActions}>
        <Switch
          value={alert.isActive}
          onValueChange={handleToggle}
          trackColor={{ false: '#253349', true: '#4338ca' }}
          thumbColor={alert.isActive ? '#818CF8' : '#94a3b8'}
          disabled={toggleAlert.isPending}
        />
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.deleteButton}
          activeOpacity={0.7}
          disabled={deleteAlert.isPending}
        >
          {deleteAlert.isPending ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AlertsScreen() {
  const { data: alerts, isLoading, isError, refetch } = useAlerts();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meus Alertas</Text>
          <View style={styles.addButtonDisabled}>
            <Ionicons name="add" size={22} color="#94a3b8" />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Alertas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/alerts/create')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isError ? (
        <EmptyState
          icon="wifi-outline"
          title="Erro ao carregar alertas"
          description="Não foi possível carregar seus alertas. Toque para tentar novamente."
          action={
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.7}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          }
        />
      ) : !alerts || alerts.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Nenhum alerta configurado"
          description={'Toque em + para criar seu primeiro alerta'}
          action={
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/alerts/create')}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.createButtonText}>Criar alerta</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AlertCard alert={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.card,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  separator: {
    height: 10,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    gap: 12,
  },
  alertIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  alertInfo: {
    flex: 1,
  },
  alertTypeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  alertCondition: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  alertLastTriggered: {
    fontSize: 11,
    color: Colors.primary.light,
    marginBottom: 6,
  },
  alertChannels: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  channelChip: {
    backgroundColor: Colors.bg.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  channelChipText: {
    fontSize: 10,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  alertActions: {
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#450a0a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  retryButton: {
    backgroundColor: Colors.primary.light,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary.light,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
