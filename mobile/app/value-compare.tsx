import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms } from '../src/hooks/usePrograms';
import { useCompareValue } from '../src/hooks/useCalculator';
import { ProgramLogo } from '../src/components/ProgramLogo';
import { Colors, Gradients } from '../src/lib/theme';

const RECOMMENDATION_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; border: string }> = {
  MILHAS: {
    label: 'Use Milhas!',
    icon: 'airplane',
    color: Colors.green.primary,
    bg: Colors.green.bg,
    border: Colors.green.border,
  },
  DINHEIRO: {
    label: 'Pague em Dinheiro',
    icon: 'cash',
    color: Colors.red.primary,
    bg: Colors.red.bg,
    border: Colors.red.border,
  },
  EQUIVALENTE: {
    label: 'Tanto Faz',
    icon: 'swap-horizontal',
    color: Colors.yellow.primary,
    bg: Colors.yellow.bg,
    border: Colors.yellow.border,
  },
};

export default function ValueCompareScreen() {
  const { data: programs } = usePrograms();
  const compareMutation = useCompareValue();

  const [cashPrice, setCashPrice] = useState('');
  const [milesRequired, setMilesRequired] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const selectedProgram = programs?.find((p) => p.id === selectedProgramId);
  const cpmProgram = selectedProgram?.currentCpm ?? 0;

  const canCompare =
    Number(cashPrice) > 0 && Number(milesRequired) > 0 && selectedProgramId;

  const handleCompare = () => {
    if (!canCompare) return;
    compareMutation.mutate({
      cashPriceBrl: Number(cashPrice),
      milesRequired: Number(milesRequired),
      cpmProgram,
    });
  };

  const result = compareMutation.data;
  const rec = result ? RECOMMENDATION_CONFIG[result.recommendation] ?? RECOMMENDATION_CONFIG.EQUIVALENTE : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Milhas vs. Dinheiro</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cash price */}
        <Text style={styles.label}>Preço em dinheiro (R$)</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputPrefix}>R$</Text>
          <TextInput
            style={styles.input}
            placeholder="1500.00"
            placeholderTextColor={Colors.text.muted}
            keyboardType="numeric"
            value={cashPrice}
            onChangeText={setCashPrice}
          />
        </View>

        {/* Miles required */}
        <Text style={styles.label}>Milhas necessárias</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="50000"
            placeholderTextColor={Colors.text.muted}
            keyboardType="numeric"
            value={milesRequired}
            onChangeText={setMilesRequired}
          />
          <Text style={styles.inputSuffix}>mi</Text>
        </View>

        {/* Program selector */}
        <Text style={styles.label}>Programa de referência (CPM)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.programsRow}
        >
          {(programs ?? []).map((prog) => (
            <TouchableOpacity
              key={prog.id}
              style={[
                styles.programOption,
                selectedProgramId === prog.id && styles.programOptionSelected,
              ]}
              onPress={() => setSelectedProgramId(prog.id)}
              activeOpacity={0.7}
            >
              <ProgramLogo slug={prog.slug} size={30} />
              <Text
                style={[
                  styles.programOptionName,
                  selectedProgramId === prog.id && styles.programOptionNameSelected,
                ]}
                numberOfLines={1}
              >
                {prog.name}
              </Text>
              <Text style={styles.programCpm}>R${prog.currentCpm.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Compare button */}
        <TouchableOpacity
          style={[styles.compareButton, !canCompare && styles.compareButtonDisabled]}
          onPress={handleCompare}
          activeOpacity={0.85}
          disabled={!canCompare || compareMutation.isPending}
        >
          <LinearGradient
            colors={Gradients.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.compareGradient}
          >
            {compareMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.compareText}>Comparar</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Result */}
        {result && rec && (
          <View style={styles.resultCard}>
            <View style={[styles.recBanner, { backgroundColor: rec.bg, borderColor: rec.border }]}>
              <Ionicons name={rec.icon} size={28} color={rec.color} />
              <Text style={[styles.recLabel, { color: rec.color }]}>{rec.label}</Text>
            </View>

            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Valor das milhas</Text>
                <Text style={styles.resultValue}>
                  R${(result.milesValueBrl ?? 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Preço em dinheiro</Text>
                <Text style={styles.resultValue}>
                  R${(result.cashPriceBrl ?? Number(cashPrice)).toFixed(2)}
                </Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Economia</Text>
                <Text
                  style={[
                    styles.resultValue,
                    {
                      color:
                        (result.savings ?? 0) > 0
                          ? Colors.green.primary
                          : (result.savings ?? 0) < 0
                          ? Colors.red.primary
                          : Colors.text.primary,
                    },
                  ]}
                >
                  R${Math.abs(result.savings ?? 0).toFixed(2)} ({Math.abs(result.savingsPercent ?? 0).toFixed(1)}%)
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.card,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 14,
  },
  inputPrefix: {
    fontSize: 16,
    color: Colors.text.muted,
    marginRight: 6,
    fontWeight: '600',
  },
  inputSuffix: {
    fontSize: 14,
    color: Colors.text.muted,
    marginLeft: 6,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: Colors.text.primary,
  },
  programsRow: {
    gap: 10,
    paddingBottom: 4,
  },
  programOption: {
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 10,
    minWidth: 80,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    gap: 4,
  },
  programOptionSelected: {
    borderColor: Colors.border.active,
    backgroundColor: Colors.primary.muted,
  },
  programOptionName: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  programOptionNameSelected: {
    color: Colors.primary.light,
  },
  programCpm: {
    fontSize: 10,
    color: Colors.text.muted,
  },
  compareButton: {
    marginTop: 24,
  },
  compareButtonDisabled: {
    opacity: 0.5,
  },
  compareGradient: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resultCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  recBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  recLabel: {
    fontSize: 20,
    fontWeight: '800',
  },
  resultDetails: {
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  resultValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  resultDivider: {
    height: 1,
    backgroundColor: Colors.border.default,
    marginVertical: 6,
  },
});
