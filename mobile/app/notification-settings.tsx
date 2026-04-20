import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  useStartWhatsAppVerify,
  useConfirmWhatsAppVerify,
} from '../src/hooks/useNotificationPrefs';
import { usePrograms } from '../src/hooks/usePrograms';

/**
 * Central de notificações:
 *  - Master switch (notifyBonus)
 *  - Filtro por pares from:to (se vazio, recebe tudo)
 *  - Opt-in de WhatsApp (só PRO; fluxo de verificação via SMS embutido)
 */
export default function NotificationSettingsScreen() {
  const prefs = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const startVerify = useStartWhatsAppVerify();
  const confirmVerify = useConfirmWhatsAppVerify();
  const programs = usePrograms();

  const [verifyStep, setVerifyStep] = useState<'idle' | 'phone' | 'code'>('idle');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const p = prefs.data;
  const selectedPairs = new Set(p?.notifyProgramPairs || []);

  const togglePair = async (pair: string) => {
    const next = new Set(selectedPairs);
    if (next.has(pair)) next.delete(pair);
    else next.add(pair);
    await update.mutateAsync({ notifyProgramPairs: Array.from(next) });
  };

  const toggleBonus = async (v: boolean) => {
    await update.mutateAsync({ notifyBonus: v });
  };

  const toggleWhatsApp = async (v: boolean) => {
    if (v && !p?.whatsappVerified) {
      setVerifyStep('phone');
      return;
    }
    try {
      await update.mutateAsync({ notifyWhatsApp: v });
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message || 'Falha ao atualizar');
    }
  };

  const handleStartVerify = async () => {
    try {
      await startVerify.mutateAsync(phone);
      setVerifyStep('code');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message || 'Número inválido');
    }
  };

  const handleConfirmVerify = async () => {
    try {
      await confirmVerify.mutateAsync(code);
      setVerifyStep('idle');
      setCode('');
      setPhone('');
      Alert.alert('Pronto!', 'WhatsApp verificado — vamos te avisar por lá também.');
    } catch (err: any) {
      Alert.alert('Código incorreto', err?.response?.data?.message || 'Tenta de novo');
    }
  };

  // Pares sugeridos (os mais comuns). Poderia vir do backend no futuro.
  const SUGGESTED_PAIRS: Array<{ label: string; pair: string }> = [
    { label: 'Livelo → Smiles', pair: 'livelo:smiles' },
    { label: 'Esfera → Smiles', pair: 'esfera:smiles' },
    { label: 'Livelo → Latam Pass', pair: 'livelo:latampass' },
    { label: 'Esfera → Latam Pass', pair: 'esfera:latampass' },
    { label: 'Livelo → TudoAzul', pair: 'livelo:tudoazul' },
    { label: 'Esfera → TudoAzul', pair: 'esfera:tudoazul' },
  ];

  if (prefs.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color="#8B5CF6" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Notificações</Text>
            <Text style={styles.subtitle}>Escolha o que receber</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Master switch */}
          <View style={styles.card}>
            <View style={styles.rowSwitch}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Alertas de bônus aprovados</Text>
                <Text style={styles.rowSub}>
                  Receba push quando um bônus novo for validado pela comunidade
                </Text>
              </View>
              <Switch
                value={!!p?.notifyBonus}
                onValueChange={toggleBonus}
                trackColor={{ false: '#334155', true: '#8B5CF6' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Pares específicos */}
          <Text style={styles.sectionTitle}>Filtrar por par de programas</Text>
          <Text style={styles.hint}>
            Nenhum selecionado = recebe todos. Selecione pra receber só os que
            interessam pro seu saldo.
          </Text>
          <View style={styles.pairsBox}>
            {SUGGESTED_PAIRS.map(({ label, pair }) => {
              const active = selectedPairs.has(pair);
              return (
                <TouchableOpacity
                  key={pair}
                  onPress={() => togglePair(pair)}
                  style={[styles.pairChip, active && styles.pairChipActive]}
                >
                  {active && <Ionicons name="checkmark" size={14} color="#A78BFA" />}
                  <Text style={[styles.pairText, active && styles.pairTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* WhatsApp — PRO only */}
          <Text style={styles.sectionTitle}>WhatsApp (Premium+)</Text>
          <View style={styles.card}>
            <View style={styles.rowSwitch}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Receber bônus via WhatsApp</Text>
                <Text style={styles.rowSub}>
                  {p?.whatsappVerified
                    ? 'Número verificado. Vamos te avisar no WhatsApp.'
                    : 'Requer verificação por SMS e plano PRO ativo.'}
                </Text>
              </View>
              <Switch
                value={!!p?.notifyWhatsApp}
                onValueChange={toggleWhatsApp}
                trackColor={{ false: '#334155', true: '#25D366' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Fluxo de verificação inline */}
          {verifyStep === 'phone' && (
            <View style={styles.verifyBox}>
              <Text style={styles.verifyTitle}>Qual seu número?</Text>
              <Text style={styles.verifyHint}>
                Mandamos um código por SMS pra garantir que é seu.
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="(11) 99999-9999"
                placeholderTextColor="#475569"
                keyboardType="phone-pad"
                style={styles.input}
                maxLength={20}
              />
              <View style={styles.btnRow}>
                <TouchableOpacity
                  onPress={() => setVerifyStep('idle')}
                  style={[styles.btnSecondary]}
                >
                  <Text style={styles.btnSecondaryText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleStartVerify}
                  disabled={startVerify.isPending || !phone}
                  style={[styles.btnPrimary, (!phone || startVerify.isPending) && { opacity: 0.5 }]}
                >
                  <LinearGradient
                    colors={['#25D366', '#128C7E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btnGradient}
                  >
                    {startVerify.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Enviar código</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {verifyStep === 'code' && (
            <View style={styles.verifyBox}>
              <Text style={styles.verifyTitle}>Digite o código</Text>
              <Text style={styles.verifyHint}>
                Código de 6 dígitos enviado por SMS. Válido por 10 minutos.
              </Text>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                placeholder="000000"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                style={[styles.input, styles.codeInput]}
                maxLength={6}
              />
              <TouchableOpacity
                onPress={handleConfirmVerify}
                disabled={confirmVerify.isPending || code.length !== 6}
                style={[styles.btnPrimary, (code.length !== 6 || confirmVerify.isPending) && { opacity: 0.5 }]}
              >
                <LinearGradient
                  colors={['#25D366', '#128C7E']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGradient}
                >
                  {confirmVerify.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Verificar</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
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

  card: {
    padding: 16, borderRadius: 12,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    marginBottom: 12,
  },
  rowSwitch: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
  rowSub: { color: '#94A3B8', fontSize: 12, marginTop: 4, lineHeight: 16 },

  sectionTitle: {
    color: '#94A3B8', fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 16, marginBottom: 6,
  },
  hint: { color: '#64748B', fontSize: 12, marginBottom: 10, lineHeight: 16 },

  pairsBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pairChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
  },
  pairChipActive: { backgroundColor: '#3B2F66', borderColor: '#8B5CF6' },
  pairText: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },
  pairTextActive: { color: '#A78BFA', fontWeight: '700' },

  verifyBox: {
    padding: 16, borderRadius: 12,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#25D366',
    marginTop: 8,
  },
  verifyTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '700' },
  verifyHint: { color: '#94A3B8', fontSize: 12, marginTop: 4, marginBottom: 12, lineHeight: 16 },
  input: {
    backgroundColor: '#0F172A', borderRadius: 8, padding: 12,
    color: '#F1F5F9', fontSize: 15,
    borderWidth: 1, borderColor: '#334155',
  },
  codeInput: {
    fontSize: 24, fontWeight: '700',
    textAlign: 'center', letterSpacing: 8,
  },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btnSecondary: {
    flex: 1, paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1, borderColor: '#334155',
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  btnPrimary: { flex: 1, borderRadius: 8, overflow: 'hidden', marginTop: 12 },
  btnGradient: { paddingVertical: 12, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
