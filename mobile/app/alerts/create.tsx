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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCreateAlert } from '../../src/hooks/useAlerts';
import { usePrograms } from '../../src/hooks/usePrograms';
import { Colors } from '../../src/lib/theme';
import type { AlertType, AlertChannel, CabinClass, CreateAlertPayload } from '../../src/types';

type IoniconName = keyof typeof Ionicons.glyphMap;

const ALERT_TYPES: { type: AlertType; label: string; description: string; icon: IoniconName; color: string }[] = [
  {
    type: 'BONUS_THRESHOLD',
    label: 'Bônus de transferência',
    description: 'Avisa quando Livelo→Smiles (ou qualquer par) atingir o bônus mínimo',
    icon: 'gift-outline',
    color: '#8B5CF6',
  },
  {
    type: 'CPM_THRESHOLD',
    label: 'Limite de CPM',
    description: 'Alerta quando o CPM cair abaixo do valor definido',
    icon: 'trending-down-outline',
    color: '#818CF8',
  },
  {
    type: 'DESTINATION',
    label: 'Destino Específico',
    description: 'Alerta para passagens a um destino específico',
    icon: 'map-pin-outline' as IoniconName,
    color: '#22c55e',
  },
  {
    type: 'PROGRAM_PROMO',
    label: 'Promoção de Programa',
    description: 'Alerta sobre promoções de um programa',
    icon: 'flash-outline',
    color: '#eab308',
  },
];

const CHANNELS: { id: AlertChannel; label: string; icon: IoniconName }[] = [
  { id: 'PUSH', label: 'Push', icon: 'notifications-outline' },
  { id: 'EMAIL', label: 'E-mail', icon: 'mail-outline' },
  { id: 'IN_APP', label: 'No app', icon: 'phone-portrait-outline' },
];

const CABIN_CLASSES: { value: CabinClass; label: string }[] = [
  { value: 'ECONOMY', label: 'Econômica' },
  { value: 'BUSINESS', label: 'Executiva' },
  { value: 'FIRST', label: 'Primeira' },
];

export default function CreateAlertScreen() {
  const createAlert = useCreateAlert();
  const { data: programs, isLoading: programsLoading } = usePrograms();

  const [selectedType, setSelectedType] = useState<AlertType | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<AlertChannel[]>(['PUSH', 'IN_APP']);

  // CPM_THRESHOLD fields
  const [cpmProgramId, setCpmProgramId] = useState('');
  const [maxCpm, setMaxCpm] = useState('');

  // DESTINATION fields
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [maxMiles, setMaxMiles] = useState('');
  const [cabinClass, setCabinClass] = useState<CabinClass>('ECONOMY');

  // PROGRAM_PROMO fields
  const [promoProgramId, setPromoProgramId] = useState('');

  // BONUS_THRESHOLD fields — slugs opcionais (vazio = wildcard)
  const [bonusFromSlug, setBonusFromSlug] = useState<string>('');
  const [bonusToSlug, setBonusToSlug] = useState<string>('');
  const [bonusMinPercent, setBonusMinPercent] = useState('');

  const toggleChannel = (channel: AlertChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const validate = (): string | null => {
    if (!selectedType) return 'Selecione um tipo de alerta';
    if (selectedChannels.length === 0) return 'Selecione pelo menos um canal de notificação';

    if (selectedType === 'CPM_THRESHOLD') {
      if (!maxCpm || isNaN(parseFloat(maxCpm))) return 'Informe um CPM máximo válido';
    }
    if (selectedType === 'DESTINATION') {
      if (!origin || origin.length < 3) return 'Informe o código IATA de origem (ex: GRU)';
      if (!destination || destination.length < 3) return 'Informe o código IATA de destino (ex: CDG)';
    }
    if (selectedType === 'BONUS_THRESHOLD') {
      const pct = parseInt(bonusMinPercent, 10);
      if (isNaN(pct) || pct < 1 || pct > 500) return 'Informe % entre 1 e 500';
    }
    return null;
  };

  const handleCreate = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Atenção', validationError);
      return;
    }

    const payload: CreateAlertPayload = {
      type: selectedType!,
      channels: selectedChannels,
      condition: {},
    };

    if (selectedType === 'CPM_THRESHOLD') {
      payload.condition.maxCpm = parseFloat(maxCpm);
      if (cpmProgramId) payload.condition.programId = cpmProgramId;
    } else if (selectedType === 'DESTINATION') {
      payload.condition.origin = origin.toUpperCase().trim();
      payload.condition.destination = destination.toUpperCase().trim();
      payload.condition.cabinClass = cabinClass;
      if (maxMiles) payload.condition.maxMiles = parseInt(maxMiles, 10);
    } else if (selectedType === 'PROGRAM_PROMO') {
      if (promoProgramId) payload.condition.programId = promoProgramId;
    } else if (selectedType === 'BONUS_THRESHOLD') {
      if (bonusFromSlug) (payload.condition as any).fromProgramSlug = bonusFromSlug;
      if (bonusToSlug) (payload.condition as any).toProgramSlug = bonusToSlug;
      (payload.condition as any).minPercent = parseInt(bonusMinPercent, 10);
    }

    try {
      await createAlert.mutateAsync(payload);
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível criar o alerta. Tente novamente.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Alerta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type selector */}
        <Text style={styles.sectionLabel}>Tipo de alerta</Text>
        <View style={styles.typeGrid}>
          {ALERT_TYPES.map((item) => {
            const isSelected = selectedType === item.type;
            return (
              <TouchableOpacity
                key={item.type}
                style={[
                  styles.typeCard,
                  isSelected && { borderColor: item.color, backgroundColor: `${item.color}15` },
                ]}
                onPress={() => setSelectedType(item.type)}
                activeOpacity={0.75}
              >
                <View style={[styles.typeIconContainer, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={[styles.typeLabel, isSelected && { color: item.color }]}>
                  {item.label}
                </Text>
                <Text style={styles.typeDescription}>{item.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dynamic form */}
        {selectedType === 'CPM_THRESHOLD' && (
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Configurar alerta de CPM</Text>

            <Text style={styles.fieldLabel}>Programa (opcional)</Text>
            {programsLoading ? (
              <ActivityIndicator color="#3B82F6" style={styles.fieldLoader} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.programScrollView}>
                <TouchableOpacity
                  style={[styles.programChip, !cpmProgramId && styles.programChipSelected]}
                  onPress={() => setCpmProgramId('')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.programChipText, !cpmProgramId && styles.programChipTextSelected]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {programs?.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.programChip, cpmProgramId === p.id && styles.programChipSelected]}
                    onPress={() => setCpmProgramId(p.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.programChipText, cpmProgramId === p.id && styles.programChipTextSelected]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.fieldLabel}>CPM máximo</Text>
            <View style={styles.inputRow}>
              <View style={[styles.inputWrapper, styles.inputFlex]}>
                <Text style={styles.inputPrefix}>R$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20,00"
                  placeholderTextColor="#475569"
                  value={maxCpm}
                  onChangeText={setMaxCpm}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.inputSuffix}>
                <Text style={styles.inputSuffixText}>/ 1.000 mi</Text>
              </View>
            </View>
          </View>
        )}

        {selectedType === 'DESTINATION' && (
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Configurar alerta de destino</Text>

            <View style={styles.iataRow}>
              <View style={styles.iataField}>
                <Text style={styles.fieldLabel}>Origem (IATA)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.iataInput]}
                    placeholder="GRU"
                    placeholderTextColor="#475569"
                    value={origin}
                    onChangeText={setOrigin}
                    autoCapitalize="characters"
                    maxLength={3}
                  />
                </View>
              </View>
              <View style={styles.iataArrow}>
                <Ionicons name="arrow-forward" size={20} color="#94a3b8" />
              </View>
              <View style={styles.iataField}>
                <Text style={styles.fieldLabel}>Destino (IATA)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.iataInput]}
                    placeholder="CDG"
                    placeholderTextColor="#475569"
                    value={destination}
                    onChangeText={setDestination}
                    autoCapitalize="characters"
                    maxLength={3}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Máximo de milhas (opcional)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Ex: 50000"
                placeholderTextColor="#475569"
                value={maxMiles}
                onChangeText={setMaxMiles}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.fieldLabel}>Classe</Text>
            <View style={styles.classRow}>
              {CABIN_CLASSES.map((cls) => (
                <TouchableOpacity
                  key={cls.value}
                  style={[styles.classButton, cabinClass === cls.value && styles.classButtonSelected]}
                  onPress={() => setCabinClass(cls.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.classButtonText, cabinClass === cls.value && styles.classButtonTextSelected]}>
                    {cls.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedType === 'BONUS_THRESHOLD' && (
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Bônus de transferência</Text>

            <Text style={styles.fieldLabel}>De qual programa? (opcional — vazio = todos)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.programScrollView}>
              {[
                { slug: '', name: 'Qualquer' },
                { slug: 'livelo', name: 'Livelo' },
                { slug: 'esfera', name: 'Esfera' },
                { slug: 'itau', name: 'Itaú' },
                { slug: 'bradesco', name: 'Bradesco' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.slug || 'any-from'}
                  style={[styles.programChip, bonusFromSlug === p.slug && styles.programChipSelected]}
                  onPress={() => setBonusFromSlug(p.slug)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.programChipText, bonusFromSlug === p.slug && styles.programChipTextSelected]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Pra qual programa? (opcional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.programScrollView}>
              {[
                { slug: '', name: 'Qualquer' },
                { slug: 'smiles', name: 'Smiles' },
                { slug: 'latampass', name: 'Latam Pass' },
                { slug: 'tudoazul', name: 'TudoAzul' },
                { slug: 'azul', name: 'Azul' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.slug || 'any-to'}
                  style={[styles.programChip, bonusToSlug === p.slug && styles.programChipSelected]}
                  onPress={() => setBonusToSlug(p.slug)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.programChipText, bonusToSlug === p.slug && styles.programChipTextSelected]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
              Me avise quando o bônus for de pelo menos
            </Text>
            <View style={styles.bonusInputRow}>
              <TextInput
                style={styles.bonusInputField}
                value={bonusMinPercent}
                onChangeText={(v) => setBonusMinPercent(v.replace(/\D/g, '').slice(0, 3))}
                keyboardType="numeric"
                placeholder="80"
                placeholderTextColor="#475569"
                maxLength={3}
              />
              <Text style={styles.bonusInputSuffix}>%</Text>
            </View>
            <View style={styles.quickPctRow}>
              {[50, 80, 100, 120].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  onPress={() => setBonusMinPercent(String(pct))}
                  style={styles.quickPct}
                >
                  <Text style={styles.quickPctText}>{pct}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedType === 'PROGRAM_PROMO' && (
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>Configurar alerta de promoção</Text>

            <Text style={styles.fieldLabel}>Programa (opcional)</Text>
            {programsLoading ? (
              <ActivityIndicator color="#3B82F6" style={styles.fieldLoader} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.programScrollView}>
                <TouchableOpacity
                  style={[styles.programChip, !promoProgramId && styles.programChipSelected]}
                  onPress={() => setPromoProgramId('')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.programChipText, !promoProgramId && styles.programChipTextSelected]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {programs?.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.programChip, promoProgramId === p.id && styles.programChipSelected]}
                    onPress={() => setPromoProgramId(p.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.programChipText, promoProgramId === p.id && styles.programChipTextSelected]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Channels */}
        <Text style={styles.sectionLabel}>Canais de notificação</Text>
        <View style={styles.channelsRow}>
          {CHANNELS.map((ch) => {
            const isSelected = selectedChannels.includes(ch.id);
            return (
              <TouchableOpacity
                key={ch.id}
                style={[styles.channelChip, isSelected && styles.channelChipSelected]}
                onPress={() => toggleChannel(ch.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={ch.icon}
                  size={16}
                  color={isSelected ? '#fff' : '#94a3b8'}
                />
                <Text style={[styles.channelChipText, isSelected && styles.channelChipTextSelected]}>
                  {ch.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Create button */}
        <TouchableOpacity
          style={[styles.createButtonOuter, createAlert.isPending && styles.createButtonDisabled]}
          onPress={handleCreate}
          activeOpacity={0.85}
          disabled={createAlert.isPending}
        >
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButton}
          >
            {createAlert.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Criar Alerta</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
    borderBottomColor: '#141C2F',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141C2F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#253349',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  typeGrid: {
    gap: 10,
    marginBottom: 24,
  },
  typeCard: {
    backgroundColor: '#141C2F',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#253349',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  typeDescription: {
    fontSize: 11,
    color: '#94a3b8',
    position: 'absolute',
    bottom: 10,
    left: 70,
    right: 14,
  },
  formSection: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  fieldLoader: {
    marginVertical: 12,
    alignSelf: 'flex-start',
  },
  programScrollView: {
    marginBottom: 4,
  },
  programChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#253349',
    backgroundColor: '#141C2F',
    marginRight: 8,
  },
  programChipSelected: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
  },
  programChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  programChipTextSelected: {
    color: '#fff',
  },
  bonusInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141C2F',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  bonusInputField: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
    paddingVertical: 14,
  },
  bonusInputSuffix: { color: '#64748b', fontSize: 22, fontWeight: '700' },
  quickPctRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickPct: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
  },
  quickPctText: { color: '#A78BFA', fontSize: 12, fontWeight: '700' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141C2F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#253349',
    paddingHorizontal: 14,
    height: 48,
  },
  inputFlex: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputPrefix: {
    fontSize: 15,
    color: '#94a3b8',
    marginRight: 6,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#f8fafc',
  },
  inputSuffix: {
    backgroundColor: '#141C2F',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#253349',
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  inputSuffixText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  iataRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iataField: {
    flex: 1,
  },
  iataArrow: {
    paddingBottom: 14,
  },
  iataInput: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 2,
  },
  classRow: {
    flexDirection: 'row',
    gap: 8,
  },
  classButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#253349',
    backgroundColor: '#141C2F',
    alignItems: 'center',
  },
  classButtonSelected: {
    borderColor: '#818CF8',
    backgroundColor: '#1e1b4b',
  },
  classButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  classButtonTextSelected: {
    color: '#818CF8',
  },
  channelsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  channelChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#253349',
    backgroundColor: '#141C2F',
  },
  channelChipSelected: {
    borderColor: '#818CF8',
    backgroundColor: '#818CF8',
  },
  channelChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  channelChipTextSelected: {
    color: '#fff',
  },
  createButtonOuter: {},
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    height: 54,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
