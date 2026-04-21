import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useRecommendCards, CardRecommendation } from '../src/hooks/useCreditCards';
import { Colors, Gradients } from '../src/lib/theme';

const TIER_COLORS: Record<string, string> = {
  STANDARD: '#64748B',
  GOLD: '#F59E0B',
  PLATINUM: '#94A3B8',
  BLACK: '#0F172A',
};

export default function CardRecommenderScreen() {
  const { t } = useTranslation();
  const recommend = useRecommendCards();
  const [spend, setSpend] = useState('');
  const [income, setIncome] = useState('');

  const run = () => {
    const spendNum = parseInt(spend.replace(/\D/g, ''), 10);
    if (!spendNum || spendNum < 500) {
      Alert.alert('Valor baixo', 'Gasto mensal mín R$ 500 pra análise fazer sentido.');
      return;
    }
    const incomeNum = income ? parseInt(income.replace(/\D/g, ''), 10) : undefined;
    recommend.mutate({ monthlySpendBrl: spendNum, monthlyIncomeBrl: incomeNum });
  };

  const renderCard = (rec: CardRecommendation, isTop = false) => {
    const tierColor = TIER_COLORS[rec.card.tier] ?? '#64748B';
    return (
      <View
        key={rec.card.id}
        style={[styles.card, isTop && styles.cardTop]}
        accessible
        accessibilityLabel={`${rec.card.name}. ${rec.reasoning}`}
      >
        {isTop && (
          <View style={styles.topBadge}>
            <Ionicons name="trophy" size={12} color="#fff" />
            <Text style={styles.topBadgeText}>MELHOR PRO SEU PERFIL</Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{rec.card.name}</Text>
            <Text style={styles.cardIssuer}>{rec.card.issuer} · {rec.card.brand}</Text>
          </View>
          <View style={[styles.tierChip, { backgroundColor: tierColor + '30', borderColor: tierColor }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>{rec.card.tier}</Text>
          </View>
        </View>

        <Text style={styles.roi}>
          R$ {rec.breakdown.netRoiBrl.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} / ano
        </Text>
        <Text style={styles.roiLabel}>Retorno líquido estimado</Text>

        <View style={styles.breakdown}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Pontos/ano</Text>
            <Text style={styles.rowValue}>
              {rec.breakdown.totalPointsYear.toLocaleString('pt-BR')}
            </Text>
          </View>
          {rec.breakdown.welcomePoints > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>+ Welcome bonus</Text>
              <Text style={[styles.rowValue, { color: Colors.green.primary }]}>
                +{rec.breakdown.welcomePoints.toLocaleString('pt-BR')}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Valor em R$ (CPM {rec.breakdown.cpmUsed.toFixed(0)})</Text>
            <Text style={styles.rowValue}>
              R$ {rec.breakdown.valueBrlYear.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Anuidade</Text>
            <Text style={[styles.rowValue, { color: Colors.red.primary }]}>
              − R$ {rec.breakdown.annualFeeBrl.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        <Text style={styles.reasoning}>{rec.reasoning}</Text>

        {rec.card.officialUrl && (
          <TouchableOpacity
            onPress={() => Linking.openURL(rec.card.officialUrl!).catch(() => {})}
            style={styles.siteBtn}
            accessibilityRole="link"
            accessibilityLabel={`Abrir site do ${rec.card.name}`}
          >
            <Ionicons name="open-outline" size={14} color={Colors.primary.light} />
            <Text style={styles.siteBtnText}>Ver no site oficial</Text>
          </TouchableOpacity>
        )}
      </View>
    );
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
        <Text style={styles.title}>Recommender de cartão</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Diz o seu gasto mensal e renda, calculo qual cartão dá mais pontos/R$ de retorno
          líquido (depois de anuidade).
        </Text>

        <Text style={styles.label}>Gasto médio mensal (R$)</Text>
        <TextInput
          style={styles.input}
          value={spend}
          onChangeText={(v) => setSpend(v.replace(/\D/g, ''))}
          keyboardType="numeric"
          placeholder="ex: 5000"
          placeholderTextColor={Colors.text.muted}
          accessibilityLabel="Gasto mensal em reais"
        />

        <Text style={styles.label}>Renda mensal (R$, opcional — filtra elegibilidade)</Text>
        <TextInput
          style={styles.input}
          value={income}
          onChangeText={(v) => setIncome(v.replace(/\D/g, ''))}
          keyboardType="numeric"
          placeholder="ex: 15000"
          placeholderTextColor={Colors.text.muted}
          accessibilityLabel="Renda mensal em reais"
        />

        <TouchableOpacity
          onPress={run}
          disabled={recommend.isPending}
          style={styles.submit}
          accessibilityRole="button"
          accessibilityLabel="Calcular"
        >
          <LinearGradient
            colors={Gradients.primary as unknown as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {recommend.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="card-outline" size={16} color="#fff" />
                <Text style={styles.submitText}>Calcular melhor cartão</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {recommend.data && (
          <>
            <Text style={styles.sectionTitle}>Recomendação top</Text>
            {recommend.data.topRecommendation &&
              renderCard(recommend.data.topRecommendation, true)}

            {recommend.data.alternatives.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Alternativas</Text>
                {recommend.data.alternatives.map((r) => renderCard(r))}
              </>
            )}

            <View style={styles.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.text.muted} />
              <Text style={styles.disclaimerText}>{recommend.data.disclaimer}</Text>
            </View>
          </>
        )}
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
  label: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  input: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  submit: { marginTop: 20 },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 10,
  },
  cardTop: { borderColor: Colors.primary.start, backgroundColor: Colors.primary.muted },
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: Colors.primary.start,
    marginBottom: 10,
  },
  topBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardName: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  cardIssuer: { fontSize: 11, color: Colors.text.muted, marginTop: 2 },
  tierChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierText: { fontSize: 10, fontWeight: '800' },
  roi: { fontSize: 28, fontWeight: '800', color: Colors.green.primary },
  roiLabel: { fontSize: 11, color: Colors.text.muted, marginBottom: 12 },
  breakdown: { gap: 6, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 12, color: Colors.text.secondary },
  rowValue: { fontSize: 12, fontWeight: '700', color: Colors.text.primary },
  reasoning: { fontSize: 11, color: Colors.text.muted, lineHeight: 15, fontStyle: 'italic' },
  siteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary.start,
  },
  siteBtnText: { fontSize: 12, color: Colors.primary.light, fontWeight: '700' },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.bg.surface,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.text.muted, lineHeight: 15 },
});
