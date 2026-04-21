import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import api from '../src/lib/api';
import { Colors, Gradients } from '../src/lib/theme';

interface TaxReport {
  csv: string;
  filename: string;
  year: number;
  totalEstimatedBrl: number;
  programsCount: number;
}

export default function TaxReportScreen() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<TaxReport | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users/tax-report', { params: { year } });
      setReport(data as TaxReport);
    } catch {
      Alert.alert(t('common.error'), t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const share = async () => {
    if (!report) return;
    try {
      await Share.share({ title: report.filename, message: report.csv });
    } catch {
      /* cancelou */
    }
  };

  const needsDeclare = report && report.totalEstimatedBrl > 40000;

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
        <Text style={styles.title}>Relatório IR</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Gera planilha CSV com seus saldos em milhas e valor estimado em R$ (CPM médio do programa).
          Útil pro seu contador na hora de declarar Bens e Direitos.
        </Text>

        {/* Year picker */}
        <Text style={styles.label}>Ano-base</Text>
        <View style={styles.yearRow}>
          {[currentYear - 2, currentYear - 1, currentYear].map((y) => (
            <TouchableOpacity
              key={y}
              onPress={() => setYear(y)}
              style={[styles.yearChip, year === y && styles.yearChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: year === y }}
              accessibilityLabel={`Ano ${y}`}
            >
              <Text style={[styles.yearText, year === y && styles.yearTextActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={generate}
          disabled={loading}
          style={styles.generateBtn}
          accessibilityRole="button"
          accessibilityLabel="Gerar relatório"
        >
          <LinearGradient
            colors={Gradients.primary as unknown as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.generateGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={16} color="#fff" />
                <Text style={styles.generateText}>Gerar relatório</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {report && (
          <>
            <View style={styles.reportCard}>
              <Text style={styles.reportLabel}>Valor total estimado ({report.year})</Text>
              <Text style={styles.reportValue}>
                R$ {report.totalEstimatedBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.reportSub}>{report.programsCount} programas · {report.filename}</Text>
            </View>

            <View style={[styles.adviceBox, needsDeclare ? styles.adviceWarn : styles.adviceOk]}>
              <Ionicons
                name={needsDeclare ? 'alert-circle' : 'checkmark-circle'}
                size={18}
                color={needsDeclare ? Colors.yellow.primary : Colors.green.primary}
              />
              <Text style={styles.adviceText}>
                {needsDeclare
                  ? 'Total > R$40k. Recomenda-se declarar em "Bens e Direitos, grupo 99". Consulte seu contador.'
                  : 'Total < R$40k. Geralmente isento de declaração. Consulte seu contador.'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={share}
              style={styles.shareBtn}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar CSV"
            >
              <Ionicons name="share-outline" size={16} color={Colors.primary.light} />
              <Text style={styles.shareText}>Compartilhar CSV</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.text.muted} />
          <Text style={styles.disclaimerText}>
            A Receita Federal não tem regra específica pra pontos. Os valores aqui são
            estimativas com CPM médio — use como ponto de partida e valide com profissional.
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
  label: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600', marginBottom: 8 },
  yearRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  yearChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  yearChipActive: {
    backgroundColor: Colors.primary.muted,
    borderColor: Colors.primary.start,
  },
  yearText: { fontSize: 14, color: Colors.text.secondary, fontWeight: '600' },
  yearTextActive: { color: Colors.primary.light },
  generateBtn: { marginBottom: 20 },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  generateText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  reportCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 12,
    alignItems: 'center',
  },
  reportLabel: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600' },
  reportValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary.light,
    marginTop: 6,
  },
  reportSub: { fontSize: 11, color: Colors.text.muted, marginTop: 4 },
  adviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  adviceWarn: {
    backgroundColor: Colors.yellow.bg,
    borderColor: Colors.yellow.border,
  },
  adviceOk: {
    backgroundColor: Colors.green.bg,
    borderColor: Colors.green.border,
  },
  adviceText: { flex: 1, fontSize: 12, color: Colors.text.primary, lineHeight: 17 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary.start,
    marginBottom: 20,
  },
  shareText: { fontSize: 14, color: Colors.primary.light, fontWeight: '700' },
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
