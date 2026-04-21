import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import {
  useMyTickets,
  useCreateTicket,
  SupportTicket,
} from '../../src/hooks/useSupport';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors, Gradients } from '../../src/lib/theme';

const CATEGORIES = [
  { key: 'GENERAL', label: 'Geral' },
  { key: 'BILLING', label: 'Pagamento' },
  { key: 'BUG', label: 'Bug' },
  { key: 'FEATURE', label: 'Sugestão' },
  { key: 'ACCOUNT', label: 'Conta' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Aberto', color: Colors.primary.light, bg: Colors.primary.muted },
  AWAITING_USER: { label: 'Aguardando você', color: '#F59E0B', bg: '#F59E0B18' },
  RESOLVED: { label: 'Resolvido', color: Colors.green.primary, bg: Colors.green.bg },
  CLOSED: { label: 'Fechado', color: Colors.text.muted, bg: Colors.bg.surface },
};

export default function SupportListScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyTickets();
  const create = useCreateTicket();
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [body, setBody] = useState('');

  const handleCreate = async () => {
    if (subject.length < 5 || body.length < 10) {
      Alert.alert('Dados inválidos', 'Assunto mín 5 chars, mensagem mín 10 chars.');
      return;
    }
    try {
      const res = await create.mutateAsync({ subject: subject.trim(), category, body: body.trim() });
      setModalOpen(false);
      setSubject('');
      setBody('');
      setCategory('GENERAL');
      router.push(`/support/${res.ticket.id}` as any);
    } catch {
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  const renderTicket = ({ item }: { item: SupportTicket }) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.OPEN;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/support/${item.id}` as any)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Ticket ${item.subject}, status ${meta.label}`}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardSubject} numberOfLines={2}>
            {item.subject}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cat}>#{item.category}</Text>
          <Text style={styles.time}>{timeAgo(item.lastActivityAt)}</Text>
        </View>
      </TouchableOpacity>
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
        <Text style={styles.title}>Meus tickets</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Novo ticket"
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary.light} />
        </View>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="help-buoy-outline"
          title="Nenhum ticket"
          description="Precisa de ajuda? Abra um ticket e nossa equipe responde em até 48h."
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          renderItem={renderTicket}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Abrir ticket</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} accessibilityLabel={t('common.close')}>
                <Ionicons name="close" size={22} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.catRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={[styles.catChip, category === c.key && styles.catChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: category === c.key }}
                  >
                    <Text style={[styles.catText, category === c.key && styles.catTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Assunto</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Resumo curto do problema"
                placeholderTextColor={Colors.text.muted}
                maxLength={200}
                accessibilityLabel="Assunto"
              />

              <Text style={styles.label}>Mensagem</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={body}
                onChangeText={setBody}
                placeholder="Descreva em detalhe. Se for bug, passos pra reproduzir ajudam muito."
                placeholderTextColor={Colors.text.muted}
                multiline
                maxLength={5000}
                accessibilityLabel="Mensagem"
              />

              <TouchableOpacity
                onPress={handleCreate}
                disabled={create.isPending}
                style={styles.submit}
                accessibilityRole="button"
                accessibilityLabel="Enviar ticket"
              >
                <LinearGradient
                  colors={Gradients.primary as unknown as readonly [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {create.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>Enviar</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.start,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardSubject: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  cat: { fontSize: 11, color: Colors.primary.light, fontWeight: '600' },
  time: { fontSize: 11, color: Colors.text.muted },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.bg.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  label: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    backgroundColor: Colors.bg.surface,
  },
  catChipActive: { borderColor: Colors.primary.start, backgroundColor: Colors.primary.muted },
  catText: { fontSize: 11, fontWeight: '600', color: Colors.text.secondary },
  catTextActive: { color: Colors.primary.light },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  inputMulti: { minHeight: 120, textAlignVertical: 'top' },
  submit: { marginTop: 20 },
  submitGradient: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
