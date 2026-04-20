import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { usePrograms } from '../src/hooks/usePrograms';
import { useUpdateBalances } from '../src/hooks/useProfile';

/**
 * Onboarding em 3 passos. Mostrado 1x após o registro.
 *
 * 1. Quais programas você usa? (seleção múltipla com chips)
 * 2. Cadastre saldo aproximado (input opcional por programa selecionado)
 * 3. Ative notificações (permissão do SO + pitch)
 *
 * Cada passo é "skippable" mas com atrito — a tela final mostra valor
 * calculado da carteira como reforço do por que cadastrar saldo valeu
 * a pena.
 *
 * Se o user skippar tudo, ainda caímos na home — não bloqueamos o
 * acesso.
 */
export default function WelcomeQuizScreen() {
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const updateBalances = useUpdateBalances();

  // Step 0 = tela intro explicando arbitragem (antes era step 1 direto)
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savedValue, setSavedValue] = useState<number | null>(null);

  const toggleProgram = (id: string) => {
    setSelectedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSaveBalances = async () => {
    setSubmitting(true);
    try {
      const payload = Array.from(selectedPrograms).map((programId) => ({
        programId,
        balance: parseInt((balances[programId] || '0').replace(/\D/g, ''), 10) || 0,
      }));
      const withBalance = payload.filter((p) => p.balance > 0);
      if (withBalance.length > 0) {
        await updateBalances.mutateAsync({ balances: withBalance });
        // Calcula valor estimado pra celebração — soma balance × avgCpm/1000
        const total = programs
          ? withBalance.reduce((acc, b) => {
              const prog = programs.find((p) => p.id === b.programId);
              const cpm = (prog as any)?.avgCpmCurrent ?? 25;
              return acc + (b.balance / 1000) * cpm;
            }, 0)
          : 0;
        setSavedValue(total);
      }
      setStep(3);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar seu saldo. Tente novamente ou pula.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestNotifications = async () => {
    setSubmitting(true);
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    } catch {
      // Usuário pode negar — tudo bem, continua
    } finally {
      setSubmitting(false);
      setStep(4);
    }
  };

  const handleFinish = () => {
    router.replace('/(tabs)' as any);
  };

  const skipAll = () => {
    router.replace('/(tabs)' as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Progress bar — step 0 não colore nenhum (é intro pré-quiz) */}
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((n) => (
            <View
              key={n}
              style={[
                styles.progressStep,
                n <= step && step > 0 && styles.progressStepActive,
              ]}
            />
          ))}
          <TouchableOpacity onPress={skipAll} style={styles.skipBtn}>
            <Text style={styles.skipText}>Pular</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {step === 0 && (
            <>
              <Text style={styles.emoji}>💡</Text>
              <Text style={styles.title}>O que a gente faz</Text>
              <Text style={styles.subtitle}>
                Milhas valem diferente em cada programa. Quando Livelo oferece 100% de
                bônus pra transferir pra Smiles, cada 1.000 pontos viram{' '}
                <Text style={{ fontWeight: '800', color: '#A78BFA' }}>2.000 milhas</Text>.
                É o que a gente chama de <Text style={{ fontWeight: '800' }}>arbitragem</Text> —
                ganho real, em R$, sem você gastar nada a mais.
              </Text>

              <View style={styles.introBox}>
                <IntroLine icon="flash" text="Notificamos no celular quando um bônus aparece" />
                <IntroLine icon="calculator" text="Calculamos quanto VOCÊ ganha em R$ no seu saldo" />
                <IntroLine icon="gift" text="Histórico, alertas, ranking, Premium grátis via missões" />
              </View>

              <PrimaryButton label="Entendi, vamos configurar" onPress={() => setStep(1)} />
              <Text style={{ color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
                Leva 30 segundos. Pode pular se quiser (botão em cima).
              </Text>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={styles.emoji}>👋</Text>
              <Text style={styles.title}>Em quais programas você tem milhas?</Text>
              <Text style={styles.subtitle}>
                Selecione os que você usa pra gente saber quais bônus importam pra você.
              </Text>
              <Text style={styles.hint}>Selecione todos que se aplicam</Text>

              {programsLoading ? (
                <ActivityIndicator color="#8B5CF6" style={{ marginTop: 30 }} />
              ) : (
                <View style={styles.chipsWrap}>
                  {programs?.map((p) => {
                    const selected = selectedPrograms.has(p.id);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => toggleProgram(p.id)}
                        style={[styles.chip, selected && styles.chipActive]}
                      >
                        <Text
                          style={[styles.chipText, selected && styles.chipTextActive]}
                        >
                          {p.name}
                        </Text>
                        {selected && (
                          <Ionicons name="checkmark-circle" size={16} color="#A78BFA" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <PrimaryButton
                label={selectedPrograms.size > 0 ? 'Continuar' : 'Não uso nenhum ainda'}
                onPress={() =>
                  selectedPrograms.size > 0 ? setStep(2) : router.replace('/(tabs)' as any)
                }
              />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.emoji}>💰</Text>
              <Text style={styles.title}>Quanto você tem?</Text>
              <Text style={styles.subtitle}>
                Calculamos o valor real da sua carteira em R$ e personalizamos as
                oportunidades de bônus pro SEU saldo. Pode deixar em branco se não
                souber.
              </Text>

              <View style={{ marginTop: 20, gap: 10 }}>
                {programs
                  ?.filter((p) => selectedPrograms.has(p.id))
                  .map((p) => (
                    <View key={p.id} style={styles.balanceRow}>
                      <Text style={styles.balanceLabel}>{p.name}</Text>
                      <TextInput
                        value={balances[p.id] || ''}
                        onChangeText={(v) =>
                          setBalances((prev) => ({
                            ...prev,
                            [p.id]: v.replace(/\D/g, ''),
                          }))
                        }
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#475569"
                        style={styles.balanceInput}
                        maxLength={10}
                      />
                      <Text style={styles.balanceSuffix}>pts</Text>
                    </View>
                  ))}
              </View>

              <PrimaryButton
                label={submitting ? 'Salvando...' : 'Continuar'}
                onPress={handleSaveBalances}
                disabled={submitting}
              />
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.emoji}>🔔</Text>
              <Text style={styles.title}>Te avisar quando aparecer?</Text>
              <Text style={styles.subtitle}>
                Bônus de transferência (50%, 80%, 100%) aparecem e somem em horas.
                Deixa a gente te notificar no momento — você nunca mais perde.
              </Text>

              <View style={styles.benefitsBox}>
                <Benefit icon="flash" text="Alerta instantâneo quando admin aprova bônus novo" />
                <Benefit
                  icon="notifications"
                  text="Só o que interessa — spam zero, máximo 2-3 por semana"
                />
                <Benefit
                  icon="shield-checkmark"
                  text="Você pode desativar a qualquer momento"
                />
              </View>

              <PrimaryButton
                label={submitting ? 'Configurando...' : 'Ativar notificações'}
                onPress={handleRequestNotifications}
                disabled={submitting}
              />
              <TouchableOpacity onPress={() => setStep(4)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>Agora não</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 4 && (
            <>
              <Text style={styles.emoji}>🚀</Text>
              <Text style={styles.title}>Tudo pronto!</Text>
              {savedValue !== null && savedValue > 0 ? (
                <View style={styles.valueCard}>
                  <LinearGradient
                    colors={['#7C3AED', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.valueInner}
                  >
                    <Text style={styles.valueLabel}>Sua carteira vale</Text>
                    <Text style={styles.valueAmount}>
                      R$ {savedValue.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    <Text style={styles.valueHint}>
                      Baseado no CPM médio atual de cada programa
                    </Text>
                  </LinearGradient>
                </View>
              ) : (
                <Text style={styles.subtitle}>
                  Já pode explorar. Quando você cadastrar saldos, calculamos quanto
                  sua carteira vale em R$ e personalizamos as oportunidades.
                </Text>
              )}

              <PrimaryButton label="Entrar no app" onPress={handleFinish} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function IntroLine({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.introLine}>
      <View style={styles.introIcon}>
        <Ionicons name={icon} size={14} color="#A78BFA" />
      </View>
      <Text style={styles.introLineText}>{text}</Text>
    </View>
  );
}

function Benefit({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>
        <Ionicons name={icon} size={16} color="#A78BFA" />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.primaryBtn, disabled && { opacity: 0.5 }]}
    >
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.primaryGradient}
      >
        <Text style={styles.primaryText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },

  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  progressStep: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: '#1E293B',
  },
  progressStepActive: { backgroundColor: '#8B5CF6' },

  introBox: {
    marginTop: 24, marginBottom: 8,
    padding: 16, borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
    gap: 12,
  },
  introLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  introIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#3B2F66',
    alignItems: 'center', justifyContent: 'center',
  },
  introLineText: { color: '#CBD5E1', fontSize: 13, flex: 1 },

  skipBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  skipText: { color: '#64748B', fontSize: 13, fontWeight: '600' },

  content: { padding: 24, paddingBottom: 60 },

  emoji: { fontSize: 48, textAlign: 'center', marginTop: 20, marginBottom: 12 },
  title: {
    color: '#F1F5F9', fontSize: 26, fontWeight: '800',
    textAlign: 'center', marginBottom: 10,
  },
  subtitle: {
    color: '#CBD5E1', fontSize: 15, lineHeight: 22,
    textAlign: 'center', marginBottom: 8,
  },
  hint: {
    color: '#64748B', fontSize: 12,
    textAlign: 'center', marginBottom: 20,
  },

  chipsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    justifyContent: 'center', marginTop: 10,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
  },
  chipActive: { backgroundColor: '#3B2F66', borderColor: '#8B5CF6' },
  chipText: { color: '#CBD5E1', fontSize: 14, fontWeight: '500' },
  chipTextActive: { color: '#A78BFA', fontWeight: '700' },

  balanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
  },
  balanceLabel: {
    color: '#F1F5F9', fontSize: 14, fontWeight: '600',
    flex: 1,
  },
  balanceInput: {
    color: '#F1F5F9', fontSize: 18, fontWeight: '700',
    minWidth: 90, textAlign: 'right',
  },
  balanceSuffix: { color: '#64748B', fontSize: 13, fontWeight: '600' },

  benefitsBox: {
    gap: 12, marginTop: 20, marginBottom: 8,
    padding: 16, borderRadius: 12,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
  },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#3B2F66',
    alignItems: 'center', justifyContent: 'center',
  },
  benefitText: { color: '#CBD5E1', fontSize: 13, flex: 1, lineHeight: 18 },

  valueCard: { marginTop: 24, marginBottom: 4 },
  valueInner: { padding: 24, borderRadius: 16, alignItems: 'center' },
  valueLabel: {
    color: 'rgba(255,255,255,0.85)', fontSize: 12,
    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700',
  },
  valueAmount: {
    color: '#fff', fontSize: 38, fontWeight: '800',
    marginVertical: 8, letterSpacing: -1,
  },
  valueHint: { color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center' },

  primaryBtn: { marginTop: 28, borderRadius: 12, overflow: 'hidden' },
  primaryGradient: { paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  secondaryBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
});
