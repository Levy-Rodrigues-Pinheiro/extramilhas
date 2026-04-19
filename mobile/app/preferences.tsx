import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getContributeState, setContributeState } from '../src/lib/contribute-preference';

/**
 * Tela de preferências do usuário.
 * Hoje: toggle do crowdsourcing. Futuro: notificações, tema, moeda, etc.
 */
export default function PreferencesScreen() {
  const [contributing, setContributing] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    getContributeState().then((s) => setContributing(s === 'accepted'));
  }, []);

  const toggle = async (next: boolean) => {
    setContributing(next);
    await setContributeState(next ? 'accepted' : 'declined');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Preferências</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Crowdsourcing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contribuição com a comunidade</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people-outline" size={22} color="#8B5CF6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>Compartilhar preços vistos</Text>
                <Text style={styles.cardDesc}>
                  Quando você clicar em "Ver preço oficial", o app captura os preços que aparecerem na
                  tela e envia pra melhorar a cobertura de rotas pra todos os usuários.
                </Text>
              </View>
              {contributing === null ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <Switch
                  value={contributing}
                  onValueChange={toggle}
                  thumbColor={contributing ? '#8B5CF6' : '#64748B'}
                  trackColor={{ false: '#334155', true: '#6D28D9' }}
                />
              )}
            </View>
          </View>

          <View style={styles.bullets}>
            <View style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.bulletText}>
                <Text style={styles.bulletBold}>Capturado:</Text> milhas, tarifa, voo, horário — dados
                públicos visíveis na tela.
              </Text>
            </View>
            <View style={styles.bullet}>
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text style={styles.bulletText}>
                <Text style={styles.bulletBold}>Não capturado:</Text> login, saldo, histórico pessoal,
                cartão ou qualquer informação privada.
              </Text>
            </View>
            <View style={styles.bullet}>
              <Ionicons name="lock-closed" size={16} color="#64748B" />
              <Text style={styles.bulletText}>
                <Text style={styles.bulletBold}>Sua privacidade:</Text> a conexão usa SEU IP e cookies do
                seu browser — igualzinho a você pesquisando manualmente.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color="#94A3B8" />
          <Text style={styles.noteText}>
            Desligar essa opção não impede você de usar o app — apenas impede a captura de preços.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  backBtn: { padding: 8, width: 40 },
  title: { color: '#fff', fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center' },
  content: { padding: 16 },

  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#94A3B8', fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
  cardDesc: { color: '#94A3B8', fontSize: 12, marginTop: 4, lineHeight: 18 },

  bullets: { marginTop: 12, paddingLeft: 4 },
  bullet: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-start' },
  bulletText: { flex: 1, color: '#CBD5E1', fontSize: 12, lineHeight: 17 },
  bulletBold: { color: '#F1F5F9', fontWeight: '600' },

  note: {
    flexDirection: 'row', gap: 6,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    marginTop: 12,
  },
  noteText: { flex: 1, color: '#94A3B8', fontSize: 11, lineHeight: 16 },
});
