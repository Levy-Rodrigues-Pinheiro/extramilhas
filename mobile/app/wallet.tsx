import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useWallet, useUpsertBalance, useDeleteBalance, WalletItem } from '../src/hooks/useWallet';
import { usePrograms } from '../src/hooks/usePrograms';

/**
 * Carteira de Milhas — tela principal de tracking de saldos.
 *
 * Mostra:
 * - Card grande "Sua carteira vale R$ X" no topo (orgulho/share)
 * - Card de alerta de expiração (se houver pontos vencendo em 30d)
 * - Lista de programas com saldo (CRUD inline)
 *
 * Sem saldo cadastrado → empty state convidando a cadastrar.
 */
export default function WalletScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch, error } = useWallet();
  const { data: programs } = usePrograms();
  const upsert = useUpsertBalance();
  const remove = useDeleteBalance();

  const [editing, setEditing] = useState<WalletItem | null>(null);
  const [adding, setAdding] = useState(false);

  const handleSave = async (programId: string, balance: number, expiresAt?: string) => {
    try {
      await upsert.mutateAsync({ programId, balance, expiresAt });
      setEditing(null);
      setAdding(false);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('errors.generic'));
    }
  };

  const handleDelete = (item: WalletItem) => {
    Alert.alert(
      'Remover saldo?',
      `Você quer remover ${item.program.name} da sua carteira?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove.mutateAsync(item.programId);
            } catch (e: any) {
              Alert.alert('Erro', e?.message || 'Falha ao remover');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text style={styles.title}>{t('wallet.title')}</Text>
          <Text style={styles.subtitle}>{t('wallet.total_miles')}</Text>
        </View>
        <TouchableOpacity onPress={() => setAdding(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#8B5CF6" />
        </TouchableOpacity>
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
          </View>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={32} color="#EF4444" />
            <Text style={styles.errorText}>{t('errors.generic')}</Text>
          </View>
        )}

        {data && (
          <>
            {/* Hero — Valor total */}
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroLabel}>{t('wallet.total_value')}</Text>
              <Text style={styles.heroValue}>
                R$ {data.summary.totalValueBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text style={styles.heroSub}>
                {data.summary.totalBalance.toLocaleString('pt-BR')} pontos em {data.summary.programsCount} programa{data.summary.programsCount !== 1 ? 's' : ''}
              </Text>
            </LinearGradient>

            {/* Alerta de expiração */}
            {data.summary.expiringCount > 0 && (
              <View style={styles.warnBox}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text style={styles.warnText}>
                  <Text style={styles.warnBold}>{data.summary.expiringCount}</Text> programa{data.summary.expiringCount !== 1 ? 's' : ''} com pontos a vencer em 30 dias
                </Text>
              </View>
            )}

            {/* Lista */}
            {data.items.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="wallet-outline" size={48} color="#64748B" />
                <Text style={styles.emptyTitle}>{t('wallet.no_balances_title')}</Text>
                <Text style={styles.emptyText}>
                  {t('wallet.no_balances_subtitle')}
                </Text>
                <TouchableOpacity
                  onPress={() => setAdding(true)}
                  style={styles.emptyBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('wallet.add_program')}
                >
                  <Text style={styles.emptyBtnText}>+ {t('wallet.add_program')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                {data.items.map((item) => (
                  <BalanceCard
                    key={item.id}
                    item={item}
                    onEdit={() => setEditing(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modal Add/Edit */}
      {(adding || editing) && (
        <BalanceModal
          item={editing}
          allPrograms={programs || []}
          existingProgramIds={data?.items.map((i) => i.programId) || []}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
          loading={upsert.isPending}
        />
      )}
    </SafeAreaView>
  );
}

function BalanceCard({
  item,
  onEdit,
  onDelete,
}: {
  item: WalletItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.card, item.isExpiringSoon && { borderColor: '#F59E0B' }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardProgram}>{item.program.name}</Text>
        {item.isExpiringSoon && (
          <View style={styles.expiryBadge}>
            <Ionicons name="time" size={11} color="#F59E0B" />
            <Text style={styles.expiryBadgeText}>{item.daysToExpiry}d</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBalanceRow}>
        <Text style={styles.cardBalance}>{item.balance.toLocaleString('pt-BR')}</Text>
        <Text style={styles.cardUnit}>pontos</Text>
      </View>
      <Text style={styles.cardValue}>
        ≈ R$ {item.valueBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        <Text style={styles.cardCpm}> · CPM R$ {item.program.avgCpm.toFixed(2)}</Text>
      </Text>
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={onEdit}
          style={styles.cardBtn}
          accessibilityRole="button"
          accessibilityLabel={t('wallet.edit_balance') + ' ' + item.program.name}
        >
          <Ionicons name="pencil" size={14} color="#8B5CF6" />
          <Text style={styles.cardBtnText}>{t('common.edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={styles.cardBtn}
          accessibilityRole="button"
          accessibilityLabel={t('wallet.delete_balance') + ' ' + item.program.name}
        >
          <Ionicons name="trash-outline" size={14} color="#EF4444" />
          <Text style={[styles.cardBtnText, { color: '#EF4444' }]}>{t('common.remove')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BalanceModal({
  item,
  allPrograms,
  existingProgramIds,
  onSave,
  onClose,
  loading,
}: {
  item: WalletItem | null;
  allPrograms: Array<{ id: string; name: string; slug: string }>;
  existingProgramIds: string[];
  onSave: (programId: string, balance: number, expiresAt?: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [programId, setProgramId] = useState(item?.programId || '');
  const [balance, setBalance] = useState(item?.balance.toString() || '');
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt?.substring(0, 10) || '');

  // Para "add", filtra programas que já estão cadastrados
  const availablePrograms = item
    ? allPrograms
    : allPrograms.filter((p) => !existingProgramIds.includes(p.id));

  const canSave = programId && balance && parseInt(balance, 10) > 0;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {item ? t('wallet.edit_balance') : t('wallet.add_program')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Programa */}
          {!item && (
            <>
              <Text style={styles.modalLabel}>{t('wallet.add_program')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {availablePrograms.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setProgramId(p.id)}
                      style={[
                        styles.programChip,
                        programId === p.id && {
                          borderColor: '#8B5CF6',
                          backgroundColor: '#3B2F66',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.programChipText,
                          programId === p.id && { color: '#A78BFA', fontWeight: '700' },
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}
          {item && (
            <View style={styles.modalProgram}>
              <Text style={styles.modalProgramText}>{item.program.name}</Text>
            </View>
          )}

          {/* Saldo */}
          <Text style={styles.modalLabel}>{t('wallet.total_miles')}</Text>
          <TextInput
            style={styles.modalInput}
            value={balance}
            onChangeText={(v) => setBalance(v.replace(/\D/g, ''))}
            keyboardType="numeric"
            placeholder={t('wallet.placeholder_miles')}
            placeholderTextColor="#475569"
            maxLength={9}
            accessibilityLabel={t('wallet.total_miles')}
          />

          {/* Expiração (opcional) */}
          <Text style={styles.modalLabel}>{t('wallet.expiring_soon')}</Text>
          <TextInput
            style={styles.modalInput}
            value={expiresAt}
            onChangeText={setExpiresAt}
            placeholder="aaaa-mm-dd"
            placeholderTextColor="#475569"
            maxLength={10}
            accessibilityLabel={t('wallet.expiring_soon')}
          />

          <TouchableOpacity
            onPress={() => onSave(programId, parseInt(balance, 10), expiresAt || undefined)}
            disabled={!canSave || loading}
            style={[styles.modalSubmit, (!canSave || loading) && { opacity: 0.5 }]}
          >
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalSubmitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>{item ? t('common.save') : t('common.add')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 8, width: 40 },
  addBtn: { padding: 8, width: 40 },
  titleBox: { flex: 1 },
  title: { color: '#fff', fontSize: 19, fontWeight: '700' },
  subtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },

  loader: { paddingVertical: 60, alignItems: 'center' },
  errorBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  errorText: { color: '#FCA5A5', fontSize: 14 },

  hero: {
    borderRadius: 18, padding: 22, marginBottom: 12,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)', fontSize: 12,
    textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5,
  },
  heroValue: {
    color: '#fff', fontSize: 36, fontWeight: '800',
    marginTop: 6, letterSpacing: -1,
  },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6 },

  warnBox: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: '#451A03', borderColor: '#F59E0B', borderWidth: 1,
    padding: 12, borderRadius: 10, marginBottom: 12,
  },
  warnText: { color: '#FCD34D', fontSize: 13, flex: 1 },
  warnBold: { fontWeight: '800' },

  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 12 },
  emptyTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    marginTop: 12, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: '#8B5CF6', borderRadius: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700' },

  card: {
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardProgram: { color: '#F1F5F9', fontSize: 16, fontWeight: '700' },
  expiryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#451A03', borderColor: '#F59E0B', borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  expiryBadgeText: { color: '#FCD34D', fontSize: 10, fontWeight: '700' },
  cardBalanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  cardBalance: { color: '#F1F5F9', fontSize: 22, fontWeight: '700' },
  cardUnit: { color: '#94A3B8', fontSize: 12 },
  cardValue: { color: '#10B981', fontSize: 13, fontWeight: '600', marginTop: 4 },
  cardCpm: { color: '#94A3B8', fontWeight: '400', fontSize: 11 },
  cardActions: {
    flexDirection: 'row', gap: 16, marginTop: 12,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155',
  },
  cardBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardBtnText: { color: '#8B5CF6', fontSize: 12, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalLabel: {
    color: '#94A3B8', fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  modalProgram: { backgroundColor: '#1E293B', padding: 12, borderRadius: 8, marginBottom: 16 },
  modalProgramText: { color: '#F1F5F9', fontSize: 14, fontWeight: '600' },
  programChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 20, backgroundColor: '#1E293B',
  },
  programChipText: { color: '#CBD5E1', fontSize: 13 },
  modalInput: {
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    borderRadius: 8, padding: 12,
    color: '#F1F5F9', fontSize: 16, marginBottom: 16,
  },
  modalSubmit: { marginTop: 8, borderRadius: 10, overflow: 'hidden' },
  modalSubmitGradient: { paddingVertical: 14, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
