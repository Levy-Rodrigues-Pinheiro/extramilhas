import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../src/lib/theme';

/**
 * Calculadora de compensação por voo atrasado/cancelado.
 *
 * Regras ANAC (vôos domésticos e internacionais partindo do Brasil,
 * Resolução ANAC 400/2016):
 *   - Atraso > 1h: assistência material (comunicação)
 *   - Atraso > 2h: alimentação
 *   - Atraso > 4h: hotel + traslado + reacomodação/reembolso
 *   - Cancelamento: reembolso integral + possível indenização
 *
 * Regras EU261 (voos na UE):
 *   - Atraso > 3h na chegada:
 *     - até 1500km: €250
 *     - 1500-3500km: €400
 *     - > 3500km: €600
 *   - Cancelamento com <14d de aviso: idem valores
 *   - Denied boarding (overbooking): idem
 *
 * Gera estimativa. Valor final depende de decisão judicial/SAC.
 */
type Regulation = 'ANAC' | 'EU261';
type Issue = 'delay' | 'cancel' | 'denied';

export default function CompensationScreen() {
  const { t } = useTranslation();
  const [regulation, setRegulation] = useState<Regulation>('ANAC');
  const [issue, setIssue] = useState<Issue>('delay');
  const [distance, setDistance] = useState('');
  const [delayHours, setDelayHours] = useState('');

  const estimate = useMemo(() => {
    const km = parseInt(distance.replace(/\D/g, ''), 10) || 0;
    const hrs = parseFloat(delayHours.replace(',', '.')) || 0;

    if (regulation === 'EU261') {
      // Só compensa se atraso >=3h (chegada) ou cancel/denied
      if (issue === 'delay' && hrs < 3) {
        return { value: 0, currency: 'EUR', note: 'EU261: atraso < 3h não gera compensação monetária.' };
      }
      let v = 0;
      if (km <= 1500) v = 250;
      else if (km <= 3500) v = 400;
      else v = 600;
      return {
        value: v,
        currency: 'EUR',
        note: issue === 'delay'
          ? `Atraso ≥3h, trecho ${km}km → €${v} por passageiro.`
          : issue === 'cancel'
          ? `Cancelamento <14d de aviso → €${v} por passageiro + reembolso.`
          : `Denied boarding → €${v} por passageiro.`,
      };
    }

    // ANAC — valores estimados (sem tabela fixa de indenização; depende de juiz)
    if (issue === 'delay') {
      if (hrs < 1) return { value: 0, currency: 'BRL', note: 'ANAC: atraso < 1h não gera deveres.' };
      if (hrs < 2)
        return {
          value: 0,
          currency: 'BRL',
          note: 'ANAC: direito a comunicação. Sem indenização direta.',
        };
      if (hrs < 4)
        return {
          value: 0,
          currency: 'BRL',
          note: 'ANAC: direito a alimentação. Dano moral raro sem prova de prejuízo.',
        };
      // >=4h
      return {
        value: 2500,
        currency: 'BRL',
        note: 'ANAC: atraso ≥4h dá direito a hotel/traslado e, em JEC, dano moral típico R$2k-5k. Use R$2500 como ponto de partida.',
      };
    }
    if (issue === 'cancel') {
      return {
        value: 3000,
        currency: 'BRL',
        note: 'Cancelamento injustificado: reembolso integral + dano moral típico R$3k-8k em JEC.',
      };
    }
    return {
      value: 5000,
      currency: 'BRL',
      note: 'Overbooking/denied boarding: dano moral típico R$5k-10k + reacomodação.',
    };
  }, [regulation, issue, distance, delayHours]);

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
        <Text style={styles.title}>Indenização de voo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Seu voo atrasou, foi cancelado, ou te barraram (overbooking)? Calcula quanto você
          pode pedir de indenização segundo a regulação aplicável.
        </Text>

        <Text style={styles.label}>Regulação</Text>
        <View style={styles.row}>
          {(['ANAC', 'EU261'] as Regulation[]).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRegulation(r)}
              style={[styles.chip, regulation === r && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: regulation === r }}
              accessibilityLabel={r}
            >
              <Text style={[styles.chipText, regulation === r && styles.chipTextActive]}>
                {r === 'ANAC' ? 'ANAC (Brasil)' : 'EU261 (Europa)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Problema</Text>
        <View style={styles.row}>
          {(
            [
              { key: 'delay', label: 'Atraso' },
              { key: 'cancel', label: 'Cancelado' },
              { key: 'denied', label: 'Overbooking' },
            ] as Array<{ key: Issue; label: string }>
          ).map((i) => (
            <TouchableOpacity
              key={i.key}
              onPress={() => setIssue(i.key)}
              style={[styles.chip, issue === i.key && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: issue === i.key }}
              accessibilityLabel={i.label}
            >
              <Text style={[styles.chipText, issue === i.key && styles.chipTextActive]}>
                {i.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {issue === 'delay' && (
          <>
            <Text style={styles.label}>Horas de atraso (na chegada)</Text>
            <TextInput
              style={styles.input}
              value={delayHours}
              onChangeText={setDelayHours}
              keyboardType="numeric"
              placeholder="ex: 4.5"
              placeholderTextColor={Colors.text.muted}
              accessibilityLabel="Horas de atraso"
            />
          </>
        )}

        {regulation === 'EU261' && (
          <>
            <Text style={styles.label}>Distância do voo (km)</Text>
            <TextInput
              style={styles.input}
              value={distance}
              onChangeText={setDistance}
              keyboardType="numeric"
              placeholder="ex: 2000"
              placeholderTextColor={Colors.text.muted}
              accessibilityLabel="Distância em km"
            />
          </>
        )}

        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Estimativa</Text>
          <Text style={styles.resultValue}>
            {estimate.value > 0
              ? `${estimate.currency === 'EUR' ? '€' : 'R$ '}${estimate.value.toLocaleString('pt-BR')}`
              : '—'}
          </Text>
          <Text style={styles.resultNote}>{estimate.note}</Text>
        </View>

        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.text.muted} />
          <Text style={styles.disclaimerText}>
            {regulation === 'ANAC'
              ? 'Valores ANAC são estimativas baseadas em sentenças de JEC. Busque advogado ou Procon.'
              : 'Valores EU261 são fixos mas dependem de causa (se foi circunstância extraordinária, cia não paga).'}
          </Text>
        </View>
      </ScrollView>
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
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 13, color: Colors.text.secondary, lineHeight: 18, marginBottom: 20 },
  label: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
  },
  chipActive: { backgroundColor: Colors.primary.muted, borderColor: Colors.primary.start },
  chipText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '600' },
  chipTextActive: { color: Colors.primary.light },
  input: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  resultBox: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.start,
    marginTop: 20,
    marginBottom: 14,
  },
  resultLabel: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600' },
  resultValue: { fontSize: 36, fontWeight: '800', color: Colors.primary.light, marginVertical: 6 },
  resultNote: { fontSize: 12, color: Colors.text.primary, textAlign: 'center', lineHeight: 17 },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.bg.surface,
    padding: 12,
    borderRadius: 8,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.text.muted, lineHeight: 15 },
});
