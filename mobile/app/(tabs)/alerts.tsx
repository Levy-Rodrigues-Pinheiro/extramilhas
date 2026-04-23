import React from 'react';
import {
  View,
  Text,
  FlatList,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAlerts, useToggleAlert, useDeleteAlert } from '../../src/hooks/useAlerts';
import type { Alert as AlertType, AlertType as AlertTypeEnum } from '../../src/types';
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
  gradients,
  motion,
  haptics,
} from '../../src/components/primitives';

type IoniconName = keyof typeof Ionicons.glyphMap;

const ALERT_TYPE_CONFIG: Record<
  AlertTypeEnum,
  { icon: IoniconName; label: string; color: string }
> = {
  CPM_THRESHOLD: { icon: 'trending-down', label: 'Limite de CPM', color: aurora.cyan },
  DESTINATION: { icon: 'map', label: 'Destino específico', color: semantic.success },
  PROGRAM_PROMO: { icon: 'flash', label: 'Promoção de programa', color: premium.goldLight },
  BONUS_THRESHOLD: { icon: 'gift', label: 'Bônus de transferência', color: aurora.magenta },
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
    if (condition.cabinClass)
      parts.push(CABIN_CLASS_LABELS[condition.cabinClass] ?? condition.cabinClass);
    if (condition.maxMiles !== undefined)
      parts.push(`≤ ${condition.maxMiles.toLocaleString('pt-BR')} mi`);
    return parts.join(' · ') || 'Alerta de destino';
  }
  if (type === 'PROGRAM_PROMO') {
    return condition.programId ? 'Promoção de programa' : 'Qualquer promoção';
  }
  if (type === 'BONUS_THRESHOLD') {
    const c = condition as any;
    const from = c.fromProgramSlug || 'qualquer';
    const to = c.toProgramSlug || 'qualquer';
    const min = c.minPercent ?? 0;
    return `${from} → ${to} · ≥ ${min}%`;
  }
  return 'Alerta configurado';
}

// ─── AlertCard ──────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: AlertType }) {
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();
  const config = ALERT_TYPE_CONFIG[alert.type];

  const handleDelete = () => {
    haptics.warning();
    Alert.alert('Excluir alerta', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          haptics.heavy();
          deleteAlert.mutate(alert.id);
        },
      },
    ]);
  };

  const handleToggle = (value: boolean) => {
    haptics.select();
    toggleAlert.mutate({ id: alert.id, isActive: value });
  };

  return (
    <GlassCard
      radiusSize="lg"
      padding={14}
      glow={alert.isActive ? (config.color === aurora.magenta ? 'magenta' : 'cyan') : 'none'}
      style={[cardStyles.card, !alert.isActive && { opacity: 0.55 }]}
    >
      <View
        style={[
          cardStyles.iconBox,
          { backgroundColor: `${config.color}1F`, borderColor: `${config.color}55` },
        ]}
      >
        <Ionicons
          name={alert.isActive ? config.icon : (`${config.icon}-outline` as IoniconName)}
          size={20}
          color={config.color}
        />
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={cardStyles.typeLabel}>{config.label}</Text>
        <Text style={cardStyles.condition} numberOfLines={2}>
          {buildConditionSummary(alert)}
        </Text>

        {alert.lastTriggeredAt && (
          <View style={cardStyles.lastTrigRow}>
            <Ionicons name="checkmark-circle" size={11} color={semantic.success} />
            <Text style={cardStyles.lastTrig}>
              Disparado em{' '}
              {new Date(alert.lastTriggeredAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        )}

        <View style={cardStyles.channels}>
          {alert.channels.map((channel) => (
            <View key={channel} style={cardStyles.channelChip}>
              <Ionicons
                name={
                  channel === 'PUSH'
                    ? 'phone-portrait-outline'
                    : channel === 'EMAIL'
                    ? 'mail-outline'
                    : 'apps-outline'
                }
                size={9}
                color={textTokens.secondary}
              />
              <Text style={cardStyles.channelChipText}>
                {channel === 'PUSH' ? 'Push' : channel === 'EMAIL' ? 'E-mail' : 'App'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={cardStyles.actions}>
        <Switch
          value={alert.isActive}
          onValueChange={handleToggle}
          trackColor={{ false: surface.glass, true: aurora.cyan }}
          thumbColor={alert.isActive ? '#FFF' : textTokens.muted}
          ios_backgroundColor={surface.glass}
          disabled={toggleAlert.isPending}
        />
        <PressableScale
          onPress={handleDelete}
          haptic="none"
          style={cardStyles.deleteBtn}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={16} color={semantic.danger} />
        </PressableScale>
      </View>
    </GlassCard>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const { data: alerts, isLoading, isError, refetch } = useAlerts();

  const goCreate = () => {
    haptics.medium();
    router.push('/alerts/create');
  };

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Meus alertas</Text>
            <Text style={styles.subtitle}>Te avisamos antes de todo mundo</Text>
          </View>
          <PressableScale onPress={goCreate} haptic="medium" style={styles.addBtn}>
            <LinearGradient
              colors={gradients.auroraCyanMagenta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="add" size={22} color="#041220" />
          </PressableScale>
        </View>

        {isLoading ? (
          <View style={{ padding: space.md, gap: 12 }}>
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </View>
        ) : isError ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="lg" padding={0} glow="danger">
              <EmptyStateIllustrated
                variant="radar"
                title="Erro ao carregar alertas"
                description="Não foi possível carregar. Tenta de novo?"
                ctaLabel="Tentar novamente"
                onCtaPress={() => refetch()}
              />
            </GlassCard>
          </View>
        ) : !alerts || alerts.length === 0 ? (
          <View style={{ padding: space.md }}>
            <GlassCard radiusSize="xl" padding={0}>
              <EmptyStateIllustrated
                variant="radar"
                title="Nenhum alerta ainda"
                description="Configure alertas pra saber na hora quando aparece um bônus bom, um CPM em promoção, ou uma janela pra transferir."
                ctaLabel="Criar primeiro alerta"
                onCtaPress={goCreate}
              />
            </GlassCard>
          </View>
        ) : (
          <FlatList
            data={alerts}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <StaggerItem index={index} baseDelay={100}>
                <AlertCard alert={item} />
              </StaggerItem>
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </AuroraBackground>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  typeLabel: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.1,
  },
  condition: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  lastTrigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  lastTrig: {
    color: semantic.success,
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  channels: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  channelChipText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  actions: {
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  deleteBtn: {
    padding: 4,
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 12,
    gap: 12,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 1,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: aurora.cyan,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  listContent: {
    padding: space.md,
    paddingBottom: 120,
  },
});
