import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Modal de opt-in do crowdsourcing.
 * Mostrado 1x quando o usuário clica pela primeira vez em "Ver preço oficial".
 * Explica com transparência o que é capturado e permite recusar.
 */
export function ContributeOptInModal({ visible, onAccept, onDecline }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBox}
          >
            <Ionicons name="people" size={32} color="#fff" />
          </LinearGradient>

          <Text style={styles.title}>Ajude a comunidade</Text>
          <Text style={styles.subtitle}>
            Enquanto você consulta preços nos sites oficiais, podemos salvar esses dados pra melhorar a
            cobertura do app pra todo mundo.
          </Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <View style={styles.row}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.rowText}>
                  <Text style={styles.rowBold}>Capturamos:</Text> preço em milhas, tarifa, número do voo,
                  horário, duração — tudo o que já aparece na tela.
                </Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
                <Text style={styles.rowText}>
                  <Text style={styles.rowBold}>Nunca capturamos:</Text> login, senha, saldo pessoal, histórico de
                  compras, dados de cartão ou qualquer informação privada.
                </Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="lock-closed" size={18} color="#64748B" />
                <Text style={styles.rowText}>
                  A conexão é feita com SEU IP e cookies — exatamente como você fazendo a pesquisa manualmente.
                  Nada sai do aparelho sem passar por essa revisão.
                </Text>
              </View>
              <View style={styles.row}>
                <Ionicons name="settings-outline" size={18} color="#64748B" />
                <Text style={styles.rowText}>
                  Pode desativar a qualquer momento em <Text style={styles.rowBold}>Perfil → Preferências</Text>.
                </Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity onPress={onAccept} activeOpacity={0.8} style={styles.primaryBtn}>
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Aceitar e continuar</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onDecline} activeOpacity={0.6} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Agora não</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  iconBox: {
    width: 56, height: 56, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  title: {
    fontSize: 22, fontWeight: '700', color: '#fff',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: '#94A3B8',
    textAlign: 'center', marginBottom: 20, lineHeight: 20,
  },
  scroll: { maxHeight: 320 },
  scrollContent: { paddingBottom: 8 },
  section: { gap: 16 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowText: { flex: 1, color: '#CBD5E1', fontSize: 13, lineHeight: 19 },
  rowBold: { color: '#F1F5F9', fontWeight: '600' },
  primaryBtn: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  primaryBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#94A3B8', fontSize: 14 },
});
