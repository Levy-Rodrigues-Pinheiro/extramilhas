import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useReferral, useApplyReferralCode } from '../src/hooks/useReferral';

/**
 * Tela de referral: mostra código do user + estatísticas + botão share
 * nativo. Seção inferior permite inserir código de outro user (só nos
 * primeiros 7d após registro, limitação backend).
 */
export default function ReferralScreen() {
  const { data, isLoading, error } = useReferral();
  const apply = useApplyReferralCode();
  const [codeInput, setCodeInput] = useState('');

  const handleShare = async () => {
    if (!data?.shareUrl) return;
    try {
      await Share.share({
        message: `🛩️ Milhas Extras — use meu código ${data.code} e ganhe 30 dias Premium grátis: ${data.shareUrl}`,
      });
    } catch {}
  };

  const handleCopy = async () => {
    if (!data?.code) return;
    await Clipboard.setStringAsync(data.code);
    Alert.alert('Copiado!', 'Código copiado pra área de transferência.');
  };

  const handleApply = async () => {
    try {
      const result = await apply.mutateAsync(codeInput.trim().toUpperCase());
      Alert.alert('🎉 Sucesso!', result.message);
      setCodeInput('');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message || 'Falha ao aplicar código');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color="#8B5CF6" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.errorText}>Falha ao carregar referral.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Indique e ganhe</Text>
            <Text style={styles.subtitle}>30 dias Premium pra cada amigo</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Card do código */}
          <LinearGradient
            colors={['#7C3AED', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.codeCard}
          >
            <Text style={styles.codeLabel}>SEU CÓDIGO</Text>
            <Text style={styles.code}>{data.code}</Text>
            <View style={styles.codeActions}>
              <TouchableOpacity onPress={handleCopy} style={styles.codeBtn}>
                <Ionicons name="copy-outline" size={16} color="#fff" />
                <Text style={styles.codeBtnText}>Copiar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={[styles.codeBtn, styles.codeBtnPrimary]}>
                <Ionicons name="share-social" size={16} color="#7C3AED" />
                <Text style={[styles.codeBtnText, { color: '#7C3AED' }]}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatPill value={data.referralsCount} label="Convidados" />
            <StatPill value={data.activeReferrals} label="Ativos" />
            <StatPill value={data.rewardDays} label="Dias ganhos" suffix="d" />
          </View>

          {/* Como funciona */}
          <View style={styles.howBox}>
            <Text style={styles.howTitle}>Como funciona</Text>
            <StepLine num={1} text="Compartilhe seu código com quem usa milhas" />
            <StepLine num={2} text="Quando ele se cadastra e insere o código, ambos ganham 30d Premium" />
            <StepLine num={3} text="Quanto mais amigos, mais tempo Premium — sem limite" />
          </View>

          {/* Aplicar código de outro */}
          {!data.referredBy && (
            <View style={styles.applyBox}>
              <Text style={styles.applySection}>Tem um código?</Text>
              <Text style={styles.applyHint}>
                Se você acabou de se cadastrar (até 7 dias), pode aplicar o código de quem te indicou.
              </Text>
              <View style={styles.applyRow}>
                <TextInput
                  value={codeInput}
                  onChangeText={(v) =>
                    setCodeInput(v.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
                  }
                  placeholder="ABCD123"
                  placeholderTextColor="#475569"
                  style={styles.codeInput}
                  maxLength={12}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  onPress={handleApply}
                  disabled={apply.isPending || codeInput.length < 6}
                  style={[
                    styles.applyBtn,
                    (apply.isPending || codeInput.length < 6) && { opacity: 0.5 },
                  ]}
                >
                  {apply.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.applyBtnText}>Aplicar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {data.referredBy && (
            <View style={styles.thanksBox}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <Text style={styles.thanksText}>
                Você foi indicado por <Text style={{ fontWeight: '700' }}>{data.referredBy.name}</Text>. 30d Premium já aplicados!
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatPill({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {value}
        {suffix}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StepLine({ num, text }: { num: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{num}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
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
  titleBox: { flex: 1 },
  title: { color: '#fff', fontSize: 19, fontWeight: '700' },
  subtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },

  content: { padding: 16, paddingBottom: 40 },
  errorText: { color: '#F87171', fontSize: 14, textAlign: 'center', marginTop: 60 },

  codeCard: {
    padding: 24, borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    color: 'rgba(255,255,255,0.8)', fontSize: 11,
    letterSpacing: 2, fontWeight: '700',
  },
  code: {
    color: '#fff', fontSize: 40, fontWeight: '800',
    letterSpacing: 4, marginVertical: 12,
  },
  codeActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  codeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  codeBtnPrimary: { backgroundColor: '#fff', borderColor: '#fff' },
  codeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stat: {
    flex: 1, padding: 14, borderRadius: 10,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    alignItems: 'center',
  },
  statValue: { color: '#F1F5F9', fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#94A3B8', fontSize: 11, marginTop: 2 },

  howBox: {
    padding: 16, borderRadius: 12,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    marginBottom: 16,
  },
  howTitle: {
    color: '#F1F5F9', fontSize: 14, fontWeight: '700',
    marginBottom: 10,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#3B2F66',
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#A78BFA', fontSize: 11, fontWeight: '800' },
  stepText: { color: '#CBD5E1', fontSize: 13, flex: 1, lineHeight: 18 },

  applyBox: {
    padding: 16, borderRadius: 12,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
  },
  applySection: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },
  applyHint: { color: '#94A3B8', fontSize: 12, marginTop: 4, marginBottom: 12, lineHeight: 16 },
  applyRow: { flexDirection: 'row', gap: 8 },
  codeInput: {
    flex: 1, backgroundColor: '#0F172A', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    color: '#F1F5F9', fontSize: 15, fontWeight: '700',
    letterSpacing: 2,
    borderWidth: 1, borderColor: '#334155',
  },
  applyBtn: {
    paddingHorizontal: 18, borderRadius: 8,
    backgroundColor: '#8B5CF6',
    alignItems: 'center', justifyContent: 'center',
  },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  thanksBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 10,
    backgroundColor: '#064E3B', borderWidth: 1, borderColor: '#10B981',
  },
  thanksText: { color: '#D1FAE5', fontSize: 13, flex: 1 },
});
