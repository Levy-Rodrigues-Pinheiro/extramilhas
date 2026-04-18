import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/app.store';
import { ProgramChip } from './ProgramChip';
import type { OfferType } from '../types';

const PROGRAMS = [
  { label: 'Smiles', slug: 'smiles' },
  { label: 'Livelo', slug: 'livelo' },
  { label: 'TudoAzul', slug: 'tudoazul' },
  { label: 'Latam Pass', slug: 'latampass' },
  { label: 'Esfera', slug: 'esfera' },
];

const TYPES: { label: string; value: OfferType }[] = [
  { label: 'Compra', value: 'COMPRA' },
  { label: 'Transferência', value: 'TRANSFERENCIA' },
  { label: 'Passagem', value: 'PASSAGEM' },
  { label: 'Promoção', value: 'PROMO' },
];

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function FilterSheet({ visible, onClose }: FilterSheetProps) {
  const {
    selectedPrograms,
    selectedTypes,
    maxCpm,
    toggleProgram,
    toggleType,
    setMaxCpm,
    resetFilters,
  } = useAppStore();

  const handleApply = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filtros</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Programs */}
          <Text style={styles.sectionTitle}>Programas</Text>
          <View style={styles.chipGrid}>
            {PROGRAMS.map((p) => (
              <ProgramChip
                key={p.slug}
                label={p.label}
                slug={p.slug}
                selected={selectedPrograms.includes(p.slug)}
                onPress={() => toggleProgram(p.slug)}
              />
            ))}
          </View>

          {/* Types */}
          <Text style={styles.sectionTitle}>Tipo de Oferta</Text>
          <View style={styles.chipGrid}>
            {TYPES.map((t) => (
              <ProgramChip
                key={t.value}
                label={t.label}
                selected={selectedTypes.includes(t.value)}
                onPress={() => toggleType(t.value)}
              />
            ))}
          </View>

          {/* Max CPM */}
          <Text style={styles.sectionTitle}>CPM Máximo (R$/1000 mi)</Text>
          <TextInput
            style={styles.cpmInput}
            value={maxCpm ? String(maxCpm) : ''}
            onChangeText={(t) => setMaxCpm(t ? parseFloat(t) : null)}
            keyboardType="decimal-pad"
            placeholder="Ex: 25,00"
            placeholderTextColor="#475569"
          />
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
            <Text style={styles.resetBtnText}>Limpar filtros</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtnOuter} onPress={handleApply} activeOpacity={0.85}>
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyBtn}
            >
              <Text style={styles.applyBtnText}>Aplicar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#253349',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#141C2F',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 20,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cpmInput: {
    backgroundColor: '#141C2F',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#253349',
    color: '#f8fafc',
    fontSize: 16,
    padding: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#141C2F',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#253349',
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  applyBtnOuter: {
    flex: 2,
  },
  applyBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
