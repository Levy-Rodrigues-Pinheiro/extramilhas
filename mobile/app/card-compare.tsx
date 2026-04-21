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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import {
  useCardCatalog,
  useCompareCards,
  type CompareResult,
} from '../src/hooks/useCreditCards';
import { Colors, Gradients } from '../src/lib/theme';

/**
 * Cobrand card comparison — user seleciona "cartão atual" vs "novo",
 * app calcula delta de ROI líquido. Entrega o item #9 do HONEST_TEST
 * que tinha sido pulado.
 */
export default function CardCompareScreen() {
  const { t } = useTranslation();
  const { data: catalog, isLoading } = useCardCatalog();
  const compare = useCompareCards();

  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [newCardId, setNewCardId] = useState<string | null>(null);
  const [spend, setSpend] = useState('');

  const run = () => {
    if (!currentCardId || !newCardId) {
      Alert.alert('Dados incompletos', 'Selecione os 2 cartões pra comparar.');
      return;
    }
    if (currentCardId === newCardId) {
      Alert.alert('Cartões iguais', 'Selecione dois cartões diferentes.');
      return;
    }
    const spendNum = parseInt(spend.replace(/\D/g, ''), 10);
    if (!spendNum || spendNum < 500) {
      Alert.alert('Gasto baixo', 'Informe gasto mensal de pelo menos R$ 500.');
      return;
    }
    compare.mutate({
      currentCardId,
      newCardId,
      monthlySpendBrl: spendNum,
    });
  };

  const result = compare.data;
  const recColor =
    result?.comparison.recommendation === 'SWITCH'
      ? Colors.green.primary
      : result?.comparison.recommendation === 'STAY'
      ? Colors.red.primary
      : Colors.text.secondary;

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
        <Text style={styles.title}>Comparar cartões</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Compare ROI líquido do seu cartão atual vs um novo que você está considerando.
          Ajuda decidir se vale a pena migrar.
        </Text>

        {isLoading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <ActivityIndicator color={Colors.primary.light} />
          </View>
        ) : !catalog || catalog.length < 2 ? (
          <Text style={styles.note}>Catálogo insuficiente — adicione mais cartões no admin.</Text>
        ) : (
          <>
            <Text style={styles.label}>Meu cartão atual</Text>
            <CardPicker
              cards={catalog}
              selectedId={currentCardId}
              onSelect={setCurrentCardId}
              exclude={newCardId}
            />

            <Text style={styles.label}>Cartão novo (considerando trocar)</Text>
            <CardPicker
              cards={catalog}
              selectedId={newCardId}
              onSelect={setNewCardId}
              exclude={currentCardId}
            />

            <Text style={styles.label}>Gasto médio mensal (R$)</Text>
            <TextInput
              style={styles.input}
              value={spend}
              onChangeText={(v) => setSpend(v.replace(/\D/g, ''))}
              keyboardType="numeric"
              placeholder="ex: 5000"
              placeholderTextColor={Colors.text.muted}
              accessibilityLabel="Gasto mensal"
            />

            <TouchableOpacity
              onPress={run}
              disabled={compare.isPending}
              style={styles.submit}
              accessibilityRole="button"
              accessibilityLabel="Comparar"
            >
              <LinearGradient
                colors={Gradients.primary as unknown as readonly [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {compare.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="swap-horizontal" size={16} color="#fff" />
                    <Text style={styles.submitText}>Comparar</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {result && (
          <>
            <View style={[styles.verdictCard, { borderColor: recColor }]}>
              <Text style={[styles.verdictText, { color: recColor }]}>{result.comparison.verdict}</Text>
              {result.comparison.deltaPercent !== null && (
                <Text style={styles.verdictSub}>
                  {result.comparison.deltaPercent > 0 ? '+' : ''}
                  {result.comparison.deltaPercent}% de variação
                </Text>
              )}
            </View>

            <View style={styles.compareRow}>
              <ComparisonCol
                title="Cartão atual"
                analysis={result.current}
                isRecommended={result.comparison.recommendation === 'STAY'}
              />
              <View style={styles.vs}>
                <Text style={styles.vsText}>vs</Text>
              </View>
              <ComparisonCol
                title="Cartão novo"
                analysis={result.new}
                isRecommended={result.comparison.recommendation === 'SWITCH'}
              />
            </View>

            <View style={styles.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.text.muted} />
              <Text style={styles.disclaimerText}>
                Estimativas baseadas em CPM médio. Cotação de anuidade pode variar por
                convênio, e bônus de welcome tem condições específicas do emissor.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CardPicker({
  cards,
  selectedId,
  onSelect,
  exclude,
}: {
  cards: Array<{ id: string; name: string; issuer: string; tier: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  exclude: string | null;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
        {cards
          .filter((c) => c.id !== exclude)
          .map((c) => {
            const selected = selectedId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => onSelect(c.id)}
                style={[pickerStyles.chip, selected && pickerStyles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={c.name}
              >
                <Text
                  style={[
                    pickerStyles.chipName,
                    selected && { color: Colors.primary.light },
                  ]}
                >
                  {c.name}
                </Text>
                <Text style={pickerStyles.chipIssuer}>
                  {c.issuer} · {c.tier}
                </Text>
              </TouchableOpacity>
            );
          })}
      </View>
    </ScrollView>
  );
}

function ComparisonCol({
  title,
  analysis,
  isRecommended,
}: {
  title: string;
  analysis: CompareResult['current'];
  isRecommended: boolean;
}) {
  return (
    <View style={[styles.col, isRecommended && styles.colRecommended]}>
      {isRecommended && (
        <View style={styles.winnerBadge}>
          <Ionicons name="trophy" size={10} color="#fff" />
          <Text style={styles.winnerText}>MELHOR</Text>
        </View>
      )}
      <Text style={styles.colTitle}>{title}</Text>
      <Text style={styles.colName}>{analysis.card.name}</Text>
      <Text style={styles.colIssuer}>{analysis.card.issuer}</Text>
      <Text style={styles.colRoi}>R$ {analysis.netRoiBrl.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</Text>
      <Text style={styles.colLabel}>ROI / ano</Text>
      <View style={styles.colDivider} />
      <Text style={styles.colStat}>Pontos/ano: {analysis.totalPointsYear.toLocaleString('pt-BR')}</Text>
      {analysis.welcomePoints > 0 && (
        <Text style={styles.colStat}>+ Welcome: {analysis.welcomePoints.toLocaleString('pt-BR')}</Text>
      )}
      <Text style={styles.colStat}>Valor: R$ {analysis.valueBrlYear.toLocaleString('pt-BR')}</Text>
      <Text style={styles.colStat}>Anuidade: −R$ {analysis.annualFeeBrl.toLocaleString('pt-BR')}</Text>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.card,
    minWidth: 140,
  },
  chipSelected: {
    borderColor: Colors.primary.start,
    backgroundColor: Colors.primary.muted,
  },
  chipName: { fontSize: 12, fontWeight: '700', color: Colors.text.primary },
  chipIssuer: { fontSize: 10, color: Colors.text.muted, marginTop: 2 },
});

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
  label: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  note: { fontSize: 12, color: Colors.text.muted, padding: 20, textAlign: 'center' },
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
  verdictCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    alignItems: 'center',
    marginTop: 24,
  },
  verdictText: { fontSize: 16, fontWeight: '800' },
  verdictSub: { fontSize: 12, color: Colors.text.muted, marginTop: 4 },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    marginTop: 14,
  },
  col: {
    flex: 1,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    position: 'relative',
  },
  colRecommended: { borderColor: Colors.green.primary, borderWidth: 2 },
  winnerBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: Colors.green.primary,
  },
  winnerText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  colTitle: { fontSize: 10, color: Colors.text.muted, fontWeight: '700', textTransform: 'uppercase' },
  colName: { fontSize: 13, fontWeight: '700', color: Colors.text.primary, marginTop: 4 },
  colIssuer: { fontSize: 10, color: Colors.text.muted, marginBottom: 10 },
  colRoi: { fontSize: 22, fontWeight: '800', color: Colors.primary.light },
  colLabel: { fontSize: 10, color: Colors.text.muted, marginBottom: 10 },
  colDivider: { height: 1, backgroundColor: Colors.border.default, marginVertical: 6 },
  colStat: { fontSize: 11, color: Colors.text.secondary, marginBottom: 3 },
  vs: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  vsText: { fontSize: 12, fontWeight: '800', color: Colors.text.muted },
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
