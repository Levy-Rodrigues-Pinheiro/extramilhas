import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useReportById, useReviewReport } from '../../src/hooks/useAdminReview';
import { useAuthStore } from '../../src/store/auth.store';

/**
 * Tela de review de um report específico — abre via deep-link do push
 * admin ("/admin-review/:id"). Permite aprovar/rejeitar inline com
 * notas opcionais.
 *
 * Se o user não é admin (isAdmin=false), mostra tela de bloqueio.
 * Evita exposição de dados sensíveis.
 */
export default function AdminReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { data: report, isLoading, error } = useReportById(id);
  const review = useReviewReport();
  const [notes, setNotes] = useState('');

  const isAdmin = (user as any)?.isAdmin || (user as any)?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={48} color="#64748B" />
          <Text style={styles.blockedTitle}>Acesso restrito</Text>
          <Text style={styles.blockedText}>
            Esta tela é só pra admins. Se você é admin, faça login com sua conta.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCta}>
            <Text style={styles.backCtaText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color="#8B5CF6" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={48} color="#F87171" />
          <Text style={styles.blockedTitle}>Report não encontrado</Text>
          <Text style={styles.blockedText}>
            Talvez já tenha sido revisado ou o ID está errado.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCta}>
            <Text style={styles.backCtaText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleReview = async (action: 'approve' | 'reject') => {
    try {
      await review.mutateAsync({ id: report.id, action, adminNotes: notes || undefined });
      Alert.alert(
        action === 'approve' ? '✅ Aprovado' : '🛑 Rejeitado',
        action === 'approve'
          ? 'Oportunidade ativa pra todo mundo. Push enviado.'
          : 'Report marcado como rejeitado.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message || 'Falha na ação');
    }
  };

  const bonusPct = Math.round(report.bonusPercent);

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
            <Text style={styles.title}>Revisar report</Text>
            <Text style={styles.subtitle}>Admin — Aprovar ou rejeitar</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero: bônus em destaque */}
          <LinearGradient
            colors={['#F59E0B', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroLabel}>BÔNUS REPORTADO</Text>
            <Text style={styles.heroValue}>+{bonusPct}%</Text>
            <Text style={styles.heroRoute}>
              {report.fromProgramSlug} → {report.toProgramSlug}
            </Text>
            {report.expiresAt && (
              <Text style={styles.heroExpires}>
                Expira: {new Date(report.expiresAt).toLocaleDateString('pt-BR')}
              </Text>
            )}
          </LinearGradient>

          {/* Reporter info */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Reportado por</Text>
            <Text style={styles.cardValue}>
              {report.reporter?.name || report.reporter?.email || report.reporterEmail || 'Anônimo'}
            </Text>
            {report.reporter?.email && (
              <Text style={styles.cardSub}>{report.reporter.email}</Text>
            )}
            <Text style={styles.cardSub}>
              {new Date(report.createdAt).toLocaleString('pt-BR')}
            </Text>
          </View>

          {/* Notas do reporter */}
          {report.notes && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Observação do reporter</Text>
              <Text style={styles.notesText}>"{report.notes}"</Text>
            </View>
          )}

          {/* Comprovante */}
          {report.screenshotUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(report.screenshotUrl!).catch(() => {})}
              style={styles.screenshotBox}
            >
              <Ionicons name="image" size={20} color="#8B5CF6" />
              <Text style={styles.screenshotText}>Ver comprovante (link)</Text>
              <Ionicons name="open-outline" size={16} color="#8B5CF6" />
            </TouchableOpacity>
          )}

          {/* Notas do admin */}
          <Text style={styles.sectionTitle}>Sua nota (opcional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: 'Confirmado via newsletter Livelo 20/04'"
            placeholderTextColor="#475569"
            multiline
            style={styles.notesInput}
            maxLength={500}
          />

          {/* Botões */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => handleReview('reject')}
              disabled={review.isPending}
              style={[styles.rejectBtn, review.isPending && { opacity: 0.5 }]}
            >
              <Ionicons name="close" size={18} color="#EF4444" />
              <Text style={styles.rejectText}>Rejeitar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleReview('approve')}
              disabled={review.isPending}
              style={[styles.approveBtn, review.isPending && { opacity: 0.5 }]}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.approveGradient}
              >
                {review.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.approveText}>Aprovar e notificar todos</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

  content: { padding: 16, paddingBottom: 80 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  blockedTitle: { color: '#F1F5F9', fontSize: 20, fontWeight: '700', marginTop: 10 },
  blockedText: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  backCta: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 8, backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
  },
  backCtaText: { color: '#F1F5F9', fontWeight: '600' },

  hero: {
    padding: 24, borderRadius: 16, alignItems: 'center',
    marginBottom: 16,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)', fontSize: 11,
    letterSpacing: 2, fontWeight: '700',
  },
  heroValue: {
    color: '#fff', fontSize: 52, fontWeight: '800',
    marginVertical: 4, letterSpacing: -2,
  },
  heroRoute: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  heroExpires: {
    color: 'rgba(255,255,255,0.9)', fontSize: 12,
    marginTop: 8,
  },

  card: {
    padding: 14, borderRadius: 10,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    marginBottom: 10,
  },
  cardLabel: {
    color: '#94A3B8', fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: { color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
  cardSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  notesText: { color: '#CBD5E1', fontSize: 13, fontStyle: 'italic', lineHeight: 18 },

  screenshotBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#3B2F66',
    marginBottom: 16,
  },
  screenshotText: { color: '#A78BFA', fontSize: 13, fontWeight: '600', flex: 1 },

  sectionTitle: {
    color: '#94A3B8', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 8, marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    borderRadius: 8, padding: 12, minHeight: 72,
    color: '#F1F5F9', fontSize: 14,
    textAlignVertical: 'top',
  },

  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1, borderColor: '#EF4444',
    backgroundColor: '#7F1D1D33',
  },
  rejectText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
  approveBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  approveGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14,
  },
  approveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
