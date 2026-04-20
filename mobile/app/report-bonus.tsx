import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCreateBonusReport } from '../src/hooks/useBonusReports';
import { haptic } from '../src/lib/haptic';

const PROGRAMS = [
  { slug: 'livelo', name: 'Livelo' },
  { slug: 'esfera', name: 'Esfera' },
  { slug: 'smiles', name: 'Smiles' },
  { slug: 'tudoazul', name: 'TudoAzul' },
  { slug: 'latampass', name: 'Latam Pass' },
];

/**
 * Reportar bônus visto na rua → vai pra fila admin → vira oportunidade
 * pra todos os usuários quando aprovado.
 *
 * Crowdsourcing principal do app — quanto mais gente reporta, mais
 * frescos os dados. Reduz dependência de scraping.
 */
export default function ReportBonusScreen() {
  const [from, setFrom] = useState('livelo');
  const [to, setTo] = useState('smiles');
  const [bonus, setBonus] = useState('');
  const [expires, setExpires] = useState('');
  const [notes, setNotes] = useState('');
  const create = useCreateBonusReport();
  const [submitted, setSubmitted] = useState<{ message: string; isDuplicate: boolean } | null>(null);

  const handleSubmit = async () => {
    const bonusNum = parseFloat(bonus.replace(',', '.'));
    if (isNaN(bonusNum) || bonusNum < 1 || bonusNum > 500) {
      Alert.alert('Bônus inválido', 'Digite um número entre 1 e 500.');
      return;
    }
    if (from === to) {
      Alert.alert('Programas iguais', 'Origem e destino não podem ser o mesmo programa.');
      return;
    }
    try {
      const result = await create.mutateAsync({
        fromProgramSlug: from,
        toProgramSlug: to,
        bonusPercent: bonusNum,
        expiresAt: expires.match(/^\d{4}-\d{2}-\d{2}$/) ? expires : undefined,
        notes: notes || undefined,
      });
      setSubmitted({ message: result.message, isDuplicate: result.isDuplicate });
      if (result.isDuplicate) haptic.warning();
      else haptic.success();
    } catch (e: any) {
      haptic.error();
      Alert.alert('Erro', e?.response?.data?.message || e?.message || 'Falha ao enviar');
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.successBox}>
          <View style={[styles.successIcon, { backgroundColor: submitted.isDuplicate ? '#451A03' : '#064E3B' }]}>
            <Ionicons
              name={submitted.isDuplicate ? 'information-circle' : 'checkmark-circle'}
              size={56}
              color={submitted.isDuplicate ? '#F59E0B' : '#10B981'}
            />
          </View>
          <Text style={styles.successTitle}>
            {submitted.isDuplicate ? 'Já temos esse!' : 'Recebido! 🙏'}
          </Text>
          <Text style={styles.successText}>{submitted.message}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.successBtn}>
            <Text style={styles.successBtnText}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setSubmitted(null);
              setBonus('');
              setNotes('');
              setExpires('');
            }}
            style={[styles.successBtn, { backgroundColor: 'transparent' }]}
          >
            <Text style={[styles.successBtnText, { color: '#8B5CF6' }]}>Reportar outro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Reportar bônus</Text>
            <Text style={styles.subtitle}>Compartilha com a comunidade</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <Ionicons name="megaphone" size={28} color="#8B5CF6" />
            <Text style={styles.introText}>
              Viu um bônus na newsletter ou no site? Reporta aqui — todos os usuários ganham
              quando o admin valida.
            </Text>
          </View>

          {/* DE */}
          <Text style={styles.label}>De qual programa?</Text>
          <View style={styles.chipRow}>
            {PROGRAMS.map((p) => (
              <TouchableOpacity
                key={p.slug}
                onPress={() => setFrom(p.slug)}
                style={[
                  styles.chip,
                  from === p.slug && { borderColor: '#8B5CF6', backgroundColor: '#3B2F66' },
                ]}
              >
                <Text style={[styles.chipText, from === p.slug && { color: '#A78BFA', fontWeight: '700' }]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* PARA */}
          <Text style={styles.label}>Para qual programa?</Text>
          <View style={styles.chipRow}>
            {PROGRAMS.filter((p) => p.slug !== from).map((p) => (
              <TouchableOpacity
                key={p.slug}
                onPress={() => setTo(p.slug)}
                style={[
                  styles.chip,
                  to === p.slug && { borderColor: '#10B981', backgroundColor: '#064E3B' },
                ]}
              >
                <Text style={[styles.chipText, to === p.slug && { color: '#34D399', fontWeight: '700' }]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* BÔNUS % */}
          <Text style={styles.label}>Quantos % de bônus?</Text>
          <View style={styles.bonusRow}>
            <TextInput
              style={styles.bonusInput}
              value={bonus}
              onChangeText={(v) => setBonus(v.replace(/[^0-9.,]/g, '').slice(0, 5))}
              keyboardType="numeric"
              placeholder="ex: 100"
              placeholderTextColor="#475569"
            />
            <Text style={styles.bonusSuffix}>%</Text>
          </View>
          <View style={styles.quickBonusRow}>
            {[40, 60, 80, 100].map((b) => (
              <TouchableOpacity
                key={b}
                onPress={() => setBonus(String(b))}
                style={styles.quickBonusChip}
              >
                <Text style={styles.quickBonusText}>{b}%</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* EXPIRA EM */}
          <Text style={styles.label}>Expira em (opcional)</Text>
          <TextInput
            style={styles.input}
            value={expires}
            onChangeText={setExpires}
            placeholder="aaaa-mm-dd (ex: 2026-12-31)"
            placeholderTextColor="#475569"
            maxLength={10}
          />

          {/* OBSERVAÇÕES */}
          <Text style={styles.label}>Observações (opcional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="ex: 'Vi na newsletter de hoje, link tal'"
            placeholderTextColor="#475569"
            maxLength={500}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={create.isPending || !bonus}
            style={[styles.submit, (!bonus || create.isPending) && { opacity: 0.5 }]}
          >
            <LinearGradient
              colors={['#8B5CF6', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {create.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.submitText}>Enviar reporte</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
  content: { padding: 16, paddingBottom: 40 },

  intro: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: '#1E293B', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#334155', marginBottom: 20,
  },
  introText: { color: '#CBD5E1', fontSize: 13, flex: 1, lineHeight: 18 },

  label: {
    color: '#94A3B8', fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 16, marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 20, backgroundColor: '#1E293B',
  },
  chipText: { color: '#CBD5E1', fontSize: 13 },

  bonusRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    borderRadius: 8, paddingHorizontal: 14,
  },
  bonusInput: { flex: 1, color: '#F1F5F9', fontSize: 24, fontWeight: '700', paddingVertical: 14 },
  bonusSuffix: { color: '#64748B', fontSize: 20, fontWeight: '600' },
  quickBonusRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickBonusChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: '#1E293B', borderColor: '#334155', borderWidth: 1,
    borderRadius: 16,
  },
  quickBonusText: { color: '#A78BFA', fontSize: 12, fontWeight: '600' },

  input: {
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    borderRadius: 8, padding: 12,
    color: '#F1F5F9', fontSize: 14,
  },

  submit: { marginTop: 24, borderRadius: 10, overflow: 'hidden' },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  successBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  successIcon: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  successText: { color: '#CBD5E1', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  successBtn: {
    marginTop: 12, paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: '#8B5CF6', borderRadius: 10,
  },
  successBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
