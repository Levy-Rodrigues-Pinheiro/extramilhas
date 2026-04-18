import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms } from '../../src/hooks/usePrograms';
import { ProgramLogo } from '../../src/components/ProgramLogo';
import { Colors } from '../../src/lib/theme';

const CHART_COLORS = ['#3B82F6', '#22c55e', '#eab308', '#ef4444', '#06b6d4'];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  good: { label: 'Boa', color: '#22c55e' },
  average: { label: 'Média', color: '#eab308' },
  expensive: { label: 'Cara', color: '#ef4444' },
};

function getCpmStatus(currentCpm: number, avgCpm: number): string {
  if (currentCpm <= avgCpm * 0.9) return 'good';
  if (currentCpm <= avgCpm * 1.1) return 'average';
  return 'expensive';
}

function generateMockHistory(currentCpm: number, days: number): number[] {
  const points: number[] = [];
  let cpm = currentCpm * 1.15;
  for (let i = 0; i < days; i++) {
    cpm = cpm + (Math.random() - 0.48) * 1.5;
    cpm = Math.max(currentCpm * 0.75, Math.min(currentCpm * 1.4, cpm));
    points.push(parseFloat(cpm.toFixed(2)));
  }
  points[points.length - 1] = currentCpm;
  return points;
}

function MiniLineChart({
  data,
  color,
  width,
  height,
}: {
  data: number[];
  color: string;
  width: number;
  height: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  return (
    <View style={{ width, height, position: 'relative' }}>
      {data.map((val, i) => {
        if (i === data.length - 1) return null;
        const x1 = (i / (data.length - 1)) * width;
        const x2 = ((i + 1) / (data.length - 1)) * width;
        const y1 = height - ((val - min) / range) * (height - 8) - 4;
        const y2 = height - ((data[i + 1] - min) / range) * (height - 8) - 4;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x1,
              top: y1,
              width: length,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
              opacity: 0.85,
            }}
          />
        );
      })}
    </View>
  );
}

export default function CompareScreen() {
  const { data: programs, isLoading } = usePrograms();
  const [selected, setSelected] = useState<string[]>([]);
  const [calcMiles, setCalcMiles] = useState('');
  const [calcProgramId, setCalcProgramId] = useState('');

  const toggleProgram = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 3) {
        Alert.alert('Limite', 'Você pode comparar no máximo 3 programas.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const selectedPrograms = programs?.filter((p) => selected.includes(p.id)) ?? [];
  const calcProgram = programs?.find((p) => p.id === calcProgramId);
  const calcMilesNum = parseInt(calcMiles.replace(/\D/g, ''), 10) || 0;
  const calcValue = calcProgram ? (calcMilesNum / 1000) * calcProgram.currentCpm : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comparar Programas</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Selecionar programas (máx. 3)</Text>

        {isLoading ? (
          <ActivityIndicator color="#3B82F6" style={styles.loader} />
        ) : (
          <View style={styles.programList}>
            {programs?.map((program) => {
              const isChecked = selected.includes(program.id);
              const colorIdx = selected.indexOf(program.id);
              const color = colorIdx >= 0 ? CHART_COLORS[colorIdx % CHART_COLORS.length] : '#334155';
              return (
                <TouchableOpacity
                  key={program.id}
                  style={[styles.programRow, isChecked && { borderColor: color }]}
                  onPress={() => toggleProgram(program.id)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isChecked && { backgroundColor: color, borderColor: color },
                    ]}
                  >
                    {isChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <ProgramLogo slug={program.slug} size={36} />
                  <View style={styles.programRowInfo}>
                    <Text style={styles.programRowName}>{program.name}</Text>
                    <Text style={styles.programRowCpm}>
                      {`R$ ${(program.currentCpm ?? 0).toFixed(2)} / 1.000 mi`}
                    </Text>
                  </View>
                  {isChecked && (
                    <View style={[styles.colorDot, { backgroundColor: color }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedPrograms.length >= 2 && (
          <View style={styles.comparisonSection}>
            <Text style={styles.sectionLabel}>Comparativo</Text>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <View style={styles.tableRowLabelBox} />
                {selectedPrograms.map((p) => {
                  const colorIdx = selected.indexOf(p.id);
                  const color = CHART_COLORS[colorIdx % CHART_COLORS.length];
                  return (
                    <View key={p.id} style={styles.tableHeaderCell}>
                      <View style={[styles.tableHeaderDot, { backgroundColor: color }]} />
                      <Text style={styles.tableHeaderText} numberOfLines={1}>
                        {p.name.split(' ')[0]}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableRowLabelText}>CPM Atual</Text>
                {selectedPrograms.map((p) => (
                  <View key={p.id} style={styles.tableCell}>
                    <Text style={styles.tableCellValue}>{`R$${(p.currentCpm ?? 0).toFixed(2)}`}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.tableRow, styles.tableRowAlt]}>
                <Text style={styles.tableRowLabelText}>CPM Médio (30d)</Text>
                {selectedPrograms.map((p) => (
                  <View key={p.id} style={styles.tableCell}>
                    <Text style={styles.tableCellValue}>{`R$${(p.averageCpm30d ?? 0).toFixed(2)}`}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.tableRow, styles.tableRowLast]}>
                <Text style={styles.tableRowLabelText}>Status</Text>
                {selectedPrograms.map((p) => {
                  const status = getCpmStatus(p.currentCpm, p.averageCpm30d);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <View key={p.id} style={styles.tableCell}>
                      <View style={[styles.statusChip, { backgroundColor: `${cfg.color}20` }]}>
                        <Text style={[styles.statusChipText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <Text style={styles.sectionLabel}>Histórico de CPM (30 dias)</Text>
            <View style={styles.chartsContainer}>
              {selectedPrograms.map((p) => {
                const colorIdx = selected.indexOf(p.id);
                const color = CHART_COLORS[colorIdx % CHART_COLORS.length];
                const historyData = generateMockHistory(p.currentCpm, 30);
                const minVal = Math.min(...historyData);
                const maxVal = Math.max(...historyData);
                return (
                  <View key={p.id} style={styles.chartCard}>
                    <View style={styles.chartCardHeader}>
                      <View style={[styles.chartLegendDot, { backgroundColor: color }]} />
                      <Text style={styles.chartCardTitle}>{p.name}</Text>
                      <Text style={[styles.chartCurrentValue, { color }]}>
                        {`R$${(p.currentCpm ?? 0).toFixed(2)}`}
                      </Text>
                    </View>
                    <View style={styles.chartArea}>
                      <View style={styles.chartYLabels}>
                        <Text style={styles.chartYLabel}>{`R$${maxVal.toFixed(0)}`}</Text>
                        <Text style={styles.chartYLabel}>{`R$${minVal.toFixed(0)}`}</Text>
                      </View>
                      <MiniLineChart data={historyData} color={color} width={210} height={60} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Calculadora rápida</Text>
        <View style={styles.calculatorCard}>
          <Text style={styles.calculatorHelp}>
            Calcule o valor em R$ das suas milhas para viagens
          </Text>

          <Text style={styles.fieldLabel}>Quantidade de milhas</Text>
          <View style={styles.calcInputWrapper}>
            <Ionicons name="airplane-outline" size={18} color="#818CF8" />
            <TextInput
              style={styles.calcInput}
              placeholder="50.000"
              placeholderTextColor="#475569"
              value={calcMiles}
              onChangeText={(t) => {
                const num = t.replace(/\D/g, '');
                setCalcMiles(num ? parseInt(num, 10).toLocaleString('pt-BR') : '');
              }}
              keyboardType="numeric"
            />
            <Text style={styles.calcUnit}>milhas</Text>
          </View>

          <Text style={styles.fieldLabel}>Programa</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.calcProgramScroll}
          >
            {programs?.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.calcProgramChip,
                  calcProgramId === p.id && styles.calcProgramChipSelected,
                ]}
                onPress={() => setCalcProgramId(p.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.calcProgramChipText,
                    calcProgramId === p.id && styles.calcProgramChipTextSelected,
                  ]}
                >
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {calcValue > 0 && calcProgram && (
            <View style={styles.calcResult}>
              <Text style={styles.calcResultLabel}>
                {calcMilesNum.toLocaleString('pt-BR')} milhas no {calcProgram.name} valem:
              </Text>
              <Text style={styles.calcResultValue}>
                {`R$ ${calcValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </Text>
              <Text style={styles.calcResultSub}>em passagens aéreas</Text>
            </View>
          )}
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.card,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 90,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  loader: {
    alignSelf: 'flex-start',
    marginVertical: 12,
  },
  programList: {
    gap: 8,
    marginBottom: 16,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.subtle,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programRowInfo: {
    flex: 1,
  },
  programRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  programRowCpm: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  comparisonSection: {
    marginBottom: 8,
  },
  tableContainer: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
    alignItems: 'center',
  },
  tableRowLabelBox: {
    width: 100,
  },
  tableHeaderCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tableHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#0a111e',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableRowLabelText: {
    width: 100,
    fontSize: 11,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  tableCell: {
    flex: 1,
    alignItems: 'center',
  },
  tableCellValue: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chartsContainer: {
    gap: 12,
    marginBottom: 8,
  },
  chartCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  chartLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chartCardTitle: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  chartCurrentValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartYLabels: {
    justifyContent: 'space-between',
    height: 60,
  },
  chartYLabel: {
    fontSize: 9,
    color: Colors.text.secondary,
  },
  calculatorCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  calculatorHelp: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  calcInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bg.primary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 8,
  },
  calcInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  calcUnit: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  calcProgramScroll: {
    marginBottom: 4,
  },
  calcProgramChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.bg.primary,
    marginRight: 8,
  },
  calcProgramChipSelected: {
    borderColor: Colors.primary.light,
    backgroundColor: Colors.primary.muted,
  },
  calcProgramChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  calcProgramChipTextSelected: {
    color: Colors.primary.light,
  },
  calcResult: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#052e16',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#166534',
    alignItems: 'center',
  },
  calcResultLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  calcResultValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#22c55e',
  },
  calcResultSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
});
