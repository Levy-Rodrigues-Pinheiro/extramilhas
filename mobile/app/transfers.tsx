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
import { useTransferPartnerships, useCalculateTransfer } from '../src/hooks/useTransfers';
import { ProgramLogo } from '../src/components/ProgramLogo';
import { EmptyState } from '../src/components/EmptyState';
import { Colors, Gradients } from '../src/lib/theme';

export default function TransfersScreen() {
  const { data: partnerships, isLoading: partnershipsLoading } = useTransferPartnerships();
  const calculateMutation = useCalculateTransfer();

  const [fromProgramId, setFromProgramId] = useState<string | null>(null);
  const [toProgramId, setToProgramId] = useState<string | null>(null);
  const [points, setPoints] = useState('');

  // Extract unique programs from partnerships
  const allPrograms: any[] = [];
  const seenIds = new Set<string>();
  (partnerships ?? []).forEach((p: any) => {
    if (p.fromProgram && !seenIds.has(p.fromProgram.id)) {
      seenIds.add(p.fromProgram.id);
      allPrograms.push(p.fromProgram);
    }
    if (p.toProgram && !seenIds.has(p.toProgram.id)) {
      seenIds.add(p.toProgram.id);
      allPrograms.push(p.toProgram);
    }
  });

  const fromProgram = allPrograms.find((p) => p.id === fromProgramId);
  const toProgram = allPrograms.find((p) => p.id === toProgramId);

  const handleCalculate = () => {
    if (!fromProgramId || !toProgramId || !points) return;
    calculateMutation.mutate({
      fromProgramId,
      toProgramId,
      points: Number(points),
    });
  };

  const result = calculateMutation.data;
  const canCalculate = fromProgramId && toProgramId && Number(points) > 0;

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
        <Text style={styles.headerTitle}>Calculadora de Transferência</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {partnershipsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary.start} />
          </View>
        ) : (
          <>
            {/* De (From) */}
            <Text style={styles.sectionLabel}>De</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.programsRow}
            >
              {allPrograms.map((prog) => (
                <TouchableOpacity
                  key={prog.id}
                  style={[
                    styles.programOption,
                    fromProgramId === prog.id && styles.programOptionSelected,
                  ]}
                  onPress={() => setFromProgramId(prog.id)}
                  activeOpacity={0.7}
                >
                  <ProgramLogo slug={prog.slug} size={32} />
                  <Text
                    style={[
                      styles.programOptionName,
                      fromProgramId === prog.id && styles.programOptionNameSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {prog.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Para (To) */}
            <Text style={styles.sectionLabel}>Para</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.programsRow}
            >
              {allPrograms.map((prog) => (
                <TouchableOpacity
                  key={prog.id}
                  style={[
                    styles.programOption,
                    toProgramId === prog.id && styles.programOptionSelected,
                  ]}
                  onPress={() => setToProgramId(prog.id)}
                  activeOpacity={0.7}
                >
                  <ProgramLogo slug={prog.slug} size={32} />
                  <Text
                    style={[
                      styles.programOptionName,
                      toProgramId === prog.id && styles.programOptionNameSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {prog.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Points input */}
            <Text style={styles.sectionLabel}>Pontos</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ex: 10000"
                placeholderTextColor={Colors.text.muted}
                keyboardType="numeric"
                value={points}
                onChangeText={setPoints}
              />
            </View>

            {/* Calculate button */}
            <TouchableOpacity
              style={[styles.calculateButton, !canCalculate && styles.calculateButtonDisabled]}
              onPress={handleCalculate}
              activeOpacity={0.85}
              disabled={!canCalculate || calculateMutation.isPending}
            >
              <LinearGradient
                colors={Gradients.primary as unknown as string[]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.calculateGradient}
              >
                {calculateMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.calculateText}>Calcular</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Result card */}
            {result && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Resultado</Text>

                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Pontos enviados</Text>
                  <Text style={styles.resultValue}>
                    {Number(result.inputPoints ?? points).toLocaleString('pt-BR')}
                  </Text>
                </View>

                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Bônus</Text>
                  <Text style={[styles.resultValue, { color: Colors.green.primary }]}>
                    +{result.bonusPercent ?? 0}%
                  </Text>
                </View>

                <View style={styles.resultDivider} />

                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Milhas recebidas</Text>
                  <Text style={[styles.resultValue, styles.resultHighlight]}>
                    {Number(result.resultMiles ?? 0).toLocaleString('pt-BR')}
                  </Text>
                </View>

                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>CPM efetivo</Text>
                  <Text style={styles.resultValue}>
                    R${(result.effectiveCpm ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </>
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
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
  },
  programsRow: {
    gap: 10,
    paddingBottom: 4,
  },
  programOption: {
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    minWidth: 80,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    gap: 6,
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
  inputContainer: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: 4,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text.primary,
  },
  calculateButton: {
    marginTop: 20,
  },
  calculateButtonDisabled: {
    opacity: 0.5,
  },
  calculateGradient: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calculateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resultCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 14,
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
  resultHighlight: {
    fontSize: 18,
    color: Colors.primary.light,
  },
  resultDivider: {
    height: 1,
    backgroundColor: Colors.border.default,
    marginVertical: 8,
  },
});
