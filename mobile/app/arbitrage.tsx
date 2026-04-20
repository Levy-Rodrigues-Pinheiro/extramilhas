import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Share,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTransferBonuses, TransferOpportunity } from '../src/hooks/useArbitrage';
import { PaywallUpsellBanner, LockedOpportunityCard } from '../src/components/PaywallGate';
import { FirstRunTip } from '../src/components/FirstRunTip';
import { ReviewCompact } from '../src/components/ReviewCompact';

type SortMode = 'best' | 'newest' | 'expiring';
type FilterMode = 'all' | 'my_programs' | 'top_only';

/**
 * Arbitragem de milhas — tela dedicada.
 *
 * Hoje: bônus de transferência (o cenário de maior valor).
 * Futuro: compra promocional, melhor programa por rota, expiração + ação.
 */
export default function ArbitrageScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch, error } = useTransferBonuses();

  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('best');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const visible = useMemo(() => {
    if (!data?.opportunities) return [];
    let list = [...data.opportunities];

    // Filtros
    if (filterMode === 'my_programs') {
      list = list.filter((o) => (o.userSourceBalance ?? 0) > 0);
    } else if (filterMode === 'top_only') {
      list = list.filter((o) => o.classification === 'IMPERDIVEL');
    }

    // Search (nome do programa origem ou destino)
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.fromProgram.name.toLowerCase().includes(q) ||
          o.toProgram.name.toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortMode === 'best') {
      list.sort((a, b) => b.gainPercent - a.gainPercent);
    } else if (sortMode === 'expiring') {
      list.sort((a, b) => {
        const ax = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        const bx = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
        return ax - bx;
      });
    }
    // 'newest' = mantém ordem original (backend já ordena por createdAt desc)

    return list;
  }, [data, search, sortMode, filterMode]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text style={styles.title}>{t('home.quick_opportunities')}</Text>
          <Text style={styles.subtitle}>
            {data?.isPersonalized
              ? t('arbitrage.best_for_your_balance')
              : t('arbitrage.subtitle')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#8B5CF6" />
        }
      >
        {isLoading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loaderText}>{t('common.loading')}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={32} color="#EF4444" />
            <Text style={styles.errorText}>{t('errors.generic')}</Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel={t('common.try_again')}
            >
              <Text style={styles.retryBtnText}>{t('common.try_again')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && data && data.count === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="trending-up-outline" size={48} color="#64748B" />
            <Text style={styles.emptyTitle}>{t('home.no_bonuses')}</Text>
            <Text style={styles.emptyText}>
              {t('home.no_bonuses_notice')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/alerts/create' as any)}
              activeOpacity={0.85}
              style={styles.emptyCta}
            >
              <LinearGradient
                colors={['#8B5CF6', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyCtaGradient}
              >
                <Ionicons name="notifications" size={15} color="#fff" />
                <Text style={styles.emptyCtaText}>Configurar alerta de bônus</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/bonus-history' as any)}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '600' }}>
                Ver bônus recentes (últimos 30 dias) →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <FirstRunTip
          tipKey="arbitrage-how-v1"
          title="Primeira vez vendo oportunidades?"
          body="Cada card é uma janela de bônus de transferência. Se o ganho % for alto E você tiver saldo no programa origem, VALE transferir. Na dúvida, abre a Calculadora."
          icon="help-circle-outline"
        />

        {data && data.count > 0 && (
          <>
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={18} color="#8B5CF6" />
              <Text style={styles.infoText}>
                <Text style={styles.infoBold}>Como funciona:</Text> transferir com bônus diminui o
                custo por milha. Quanto maior o ganho %, mais vale o movimento.
              </Text>
            </View>

            {/* Search + filters + sort */}
            <View style={filters.box}>
              <View style={filters.searchRow}>
                <Ionicons name="search" size={16} color="#94A3B8" />
                <TextInput
                  style={filters.searchInput}
                  placeholder={t('common.search')}
                  placeholderTextColor="#64748B"
                  value={search}
                  onChangeText={setSearch}
                  accessibilityLabel={t('common.search')}
                />
                {search.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearch('')}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={filters.chipsRow}
              >
                {(
                  [
                    { key: 'all', label: t('arbitrage.filter_all') },
                    { key: 'my_programs', label: t('arbitrage.filter_my_programs') },
                    { key: 'top_only', label: t('arbitrage.filter_top_only') },
                  ] as Array<{ key: FilterMode; label: string }>
                ).map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setFilterMode(f.key)}
                    style={[filters.chip, filterMode === f.key && filters.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filterMode === f.key }}
                    accessibilityLabel={f.label}
                  >
                    <Text style={[filters.chipText, filterMode === f.key && filters.chipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={filters.divider} />
                {(
                  [
                    { key: 'best', label: t('arbitrage.sort_best') },
                    { key: 'newest', label: t('arbitrage.sort_newest') },
                    { key: 'expiring', label: t('arbitrage.sort_expiring') },
                  ] as Array<{ key: SortMode; label: string }>
                ).map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setSortMode(s.key)}
                    style={[filters.chip, sortMode === s.key && filters.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sortMode === s.key }}
                    accessibilityLabel={`${t('arbitrage.sort_by')}: ${s.label}`}
                  >
                    <Ionicons
                      name={
                        s.key === 'best' ? 'trending-up' : s.key === 'expiring' ? 'time-outline' : 'calendar-outline'
                      }
                      size={12}
                      color={sortMode === s.key ? '#A78BFA' : '#64748B'}
                    />
                    <Text style={[filters.chipText, sortMode === s.key && filters.chipTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {visible.length === 0 && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#94A3B8', fontSize: 13 }}>
                  {search
                    ? `Nenhuma oportunidade com "${search}"`
                    : 'Nenhuma oportunidade com esses filtros'}
                </Text>
              </View>
            )}

            {visible.map((op) => (
              <OpportunityCard key={op.id} opportunity={op} />
            ))}

            {/* Paywall: banner + 2 cards locked como preview */}
            {data.shouldUpsell && data.lockedCount && data.lockedCount > 0 ? (
              <>
                <PaywallUpsellBanner lockedCount={data.lockedCount} />
                {Array.from({ length: Math.min(2, data.lockedCount) }).map((_, i) => (
                  <LockedOpportunityCard key={`locked-${i}`} index={i} />
                ))}
              </>
            ) : null}
          </>
        )}

        {/* Link pro histórico completo */}
        <TouchableOpacity
          onPress={() => router.push('/bonus-history' as any)}
          activeOpacity={0.85}
          style={historyLink.box}
        >
          <Ionicons name="time-outline" size={18} color="#A78BFA" />
          <Text style={historyLink.text}>Ver histórico dos últimos 90 dias →</Text>
        </TouchableOpacity>

        {/* CTA Reportar bônus — sempre visível, não só quando vazio */}
        <TouchableOpacity
          onPress={() => router.push('/report-bonus' as any)}
          activeOpacity={0.85}
          style={cta.box}
        >
          <View style={cta.iconBox}>
            <Ionicons name="megaphone" size={20} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cta.title}>{t('arbitrage.report_cta_title')}</Text>
            <Text style={cta.text}>{t('arbitrage.report_cta_text')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const filters = StyleSheet.create({
  box: {
    marginTop: 4,
    marginBottom: 14,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#141C2F',
    borderWidth: 1,
    borderColor: '#253349',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#F8FAFC',
    paddingVertical: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#253349',
    backgroundColor: '#141C2F',
  },
  chipActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#3B2F66',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  chipTextActive: {
    color: '#A78BFA',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: '#253349',
    marginHorizontal: 4,
  },
});

const historyLink = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    paddingVertical: 12, marginTop: 16,
    borderRadius: 10,
    borderWidth: 1, borderColor: '#3B2F66',
    backgroundColor: '#1E1B4B',
  },
  text: { color: '#A78BFA', fontSize: 13, fontWeight: '600' },
});

const cta = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1E293B', borderColor: '#3B2F66', borderWidth: 1,
    padding: 16, borderRadius: 14, marginTop: 16,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#3B2F66', alignItems: 'center', justifyContent: 'center',
  },
  title: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },
  text: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
});

function OpportunityCard({ opportunity: o }: { opportunity: TransferOpportunity }) {
  const { t } = useTranslation();
  const color =
    o.classification === 'IMPERDIVEL' ? '#10B981' : o.classification === 'BOA' ? '#F59E0B' : '#64748B';
  const label =
    o.classification === 'IMPERDIVEL'
      ? t('arbitrage.classification_imperdivel')
      : o.classification === 'BOA'
      ? t('arbitrage.classification_boa')
      : t('arbitrage.classification_normal');

  const daysLeft =
    o.expiresAt != null
      ? Math.max(0, Math.ceil((new Date(o.expiresAt).getTime() - Date.now()) / (86_400_000)))
      : null;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[`${color}20`, `${color}05`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: `${color}25`, borderColor: color }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
          {daysLeft !== null && (
            <Text style={styles.daysLeft}>
              {daysLeft > 0 ? t('wallet.expires_in_days', { days: daysLeft }) : t('wallet.expiring_soon')}
            </Text>
          )}
        </View>

        <View style={styles.transferRow}>
          <View style={styles.programBox}>
            <Text style={styles.programLabel}>DE</Text>
            <Text style={styles.programName}>{o.fromProgram.name}</Text>
            <Text style={styles.programCpm}>CPM R$ {o.fromProgram.avgCpm.toFixed(2)}</Text>
          </View>

          <View style={styles.arrowBox}>
            <Ionicons name="arrow-forward" size={20} color="#8B5CF6" />
            <Text style={styles.bonusText}>+{o.currentBonus.toFixed(0)}%</Text>
          </View>

          <View style={styles.programBox}>
            <Text style={styles.programLabel}>PARA</Text>
            <Text style={styles.programName}>{o.toProgram.name}</Text>
            <Text style={styles.programCpm}>CPM R$ {o.toProgram.avgCpm.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>CPM efetivo</Text>
            <Text style={[styles.metricValue, { color }]}>R$ {o.effectiveCpm.toFixed(2)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Ganho</Text>
            <Text style={[styles.metricValue, { color }]}>{o.gainPercent.toFixed(1)}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>+/1.000mi</Text>
            <Text style={styles.metricValue}>R$ {o.valueGainPer1000.toFixed(2)}</Text>
          </View>
        </View>

        {o.userSourceBalance != null && o.userSourceBalance > 0 && (
          <View style={styles.personalBox}>
            <Text style={styles.personalTitle}>Pra você:</Text>
            <Text style={styles.personalText}>
              Você tem <Text style={styles.personalBold}>{o.userSourceBalance.toLocaleString('pt-BR')}</Text>{' '}
              pontos {o.fromProgram.name}. Transferindo agora viram{' '}
              <Text style={styles.personalBold}>
                {o.potentialResultingMiles?.toLocaleString('pt-BR')}
              </Text>{' '}
              milhas {o.toProgram.name} — valor extra capturado: R${' '}
              <Text style={styles.personalBold}>{o.potentialValueGain?.toFixed(2)}</Text>
            </Text>
          </View>
        )}

        {/* CTAs duplos: principal = ir transferir, secundário = share.
            A11y: labels descrevem AÇÃO, hitSlop aumenta tap target. */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            onPress={() => openTransferFlow(o)}
            activeOpacity={0.85}
            style={styles.transferBtn}
            accessibilityRole="link"
            accessibilityLabel={`Abrir site do ${o.fromProgram.name} pra transferir ${o.currentBonus.toFixed(0)}% de bônus`}
          >
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.transferGradient}
            >
              <Ionicons name="open-outline" size={16} color="#fff" />
              <Text style={styles.transferText}>{t('arbitrage.transfer_button')} · {o.fromProgram.name}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => shareOpportunity(o)}
            activeOpacity={0.7}
            style={styles.shareBtn}
            accessibilityRole="button"
            accessibilityLabel={t('arbitrage.share_aria')}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="share-social-outline" size={18} color="#25D366" />
          </TouchableOpacity>
        </View>

        {/* Review compact: funcionou ou não + agregado */}
        <ReviewCompact partnershipId={o.id} />
      </LinearGradient>
    </View>
  );
}

// URLs oficiais dos programas de origem — user pula direto pra fazer
// transferência. Fallback em Google search quando desconhecido.
const PROGRAM_URLS: Record<string, string> = {
  livelo: 'https://www.livelo.com.br/transfira-seus-pontos',
  esfera: 'https://www.esferasantanderbanespa.com.br/',
  itau: 'https://www.itau.com.br/cartoes/programa-sempre-presente',
  bradesco: 'https://www.bradesco.com.br/',
  sicredi: 'https://www.sicredi.com.br/',
};

async function openTransferFlow(o: TransferOpportunity) {
  const url = PROGRAM_URLS[o.fromProgram.slug];
  if (url) {
    await Linking.openURL(url).catch(() => {});
    return;
  }
  const q = encodeURIComponent(`${o.fromProgram.name} transferir pontos ${o.toProgram.name}`);
  await Linking.openURL(`https://www.google.com/search?q=${q}`).catch(() => {});
}

async function shareOpportunity(o: TransferOpportunity) {
  const bonus = Math.round(o.currentBonus);
  const gain = o.gainPercent.toFixed(1);
  const message =
    `🎁 Bônus ativo: ${bonus}% ${o.fromProgram.name} → ${o.toProgram.name}\n\n` +
    `Ganho real de ${gain}% no valor das milhas. Descobri no Milhas Extras — baixe o app pra calcular na sua carteira:\n\n` +
    `https://milhasextras.com.br`;
  try {
    await Share.share({ message });
  } catch {
    /* user cancelou */
  }
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
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  content: { padding: 16, paddingBottom: 32 },

  loader: { alignItems: 'center', paddingVertical: 60 },
  loaderText: { color: '#94A3B8', marginTop: 12, fontSize: 13 },

  errorBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  errorText: { color: '#F1F5F9', fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: '#1E293B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#8B5CF6', fontWeight: '600' },

  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  transferBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  transferGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12,
  },
  transferText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  shareBtn: {
    width: 46, height: 46,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#064E3B',
    borderWidth: 1, borderColor: '#25D366',
  },
  shareText: { color: '#25D366', fontSize: 12, fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24, gap: 10 },
  emptyCta: { marginTop: 12, borderRadius: 10, overflow: 'hidden' },
  emptyCtaGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  emptyCtaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '600' },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 18 },

  infoBanner: {
    flexDirection: 'row', gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#334155',
    marginBottom: 16, alignItems: 'flex-start',
  },
  infoText: { flex: 1, color: '#CBD5E1', fontSize: 12, lineHeight: 18 },
  infoBold: { color: '#F1F5F9', fontWeight: '600' },

  card: { marginBottom: 14, borderRadius: 16, overflow: 'hidden' },
  cardGradient: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 16,
  },

  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  daysLeft: { color: '#94A3B8', fontSize: 11 },

  transferRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  programBox: { flex: 1 },
  programLabel: {
    color: '#64748B', fontSize: 10, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  programName: { color: '#F1F5F9', fontSize: 15, fontWeight: '700' },
  programCpm: { color: '#94A3B8', fontSize: 11, marginTop: 2 },

  arrowBox: {
    paddingHorizontal: 12, alignItems: 'center', gap: 4,
  },
  bonusText: {
    color: '#8B5CF6', fontSize: 13, fontWeight: '700',
    backgroundColor: '#3B2F66',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
  },

  metricsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155',
  },
  metric: { flex: 1, alignItems: 'center' },
  metricLabel: {
    color: '#64748B', fontSize: 10, fontWeight: '500',
    textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4,
  },
  metricValue: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },

  personalBox: {
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#334155',
  },
  personalTitle: {
    color: '#10B981', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  personalText: { color: '#CBD5E1', fontSize: 12, lineHeight: 18 },
  personalBold: { color: '#F1F5F9', fontWeight: '700' },
});
