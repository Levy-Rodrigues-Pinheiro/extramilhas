import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/lib/ThemeProvider';
import { ACCENT_OPTIONS, type AccentColor, type ThemeMode } from '../../src/lib/themes';

export default function ThemeSettingsScreen() {
  const { t } = useTranslation();
  const { palette, mode, accent, setMode, setAccent } = useTheme();

  const styles = makeStyles(palette);

  const modes: Array<{ key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'dark', label: 'Escuro', icon: 'moon' },
    { key: 'light', label: 'Claro', icon: 'sunny' },
    { key: 'system', label: 'Seguir sistema', icon: 'phone-portrait-outline' },
  ];

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
          <Ionicons name="chevron-back" size={22} color={palette.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Aparência</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Modo</Text>
        <View style={styles.card}>
          {modes.map((m, i) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => setMode(m.key)}
              style={[styles.row, i < modes.length - 1 && styles.rowDivider]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === m.key }}
              accessibilityLabel={m.label}
            >
              <Ionicons name={m.icon} size={18} color={palette.primary.light} />
              <Text style={styles.rowLabel}>{m.label}</Text>
              {mode === m.key && (
                <Ionicons name="checkmark" size={18} color={palette.green.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Cor de destaque</Text>
        <Text style={styles.note}>
          Escolha a cor principal dos botões e elementos interativos.
        </Text>
        <View style={styles.accentGrid}>
          <TouchableOpacity
            onPress={() => setAccent(null)}
            style={[styles.accentOption, !accent && styles.accentSelected]}
            accessibilityRole="button"
            accessibilityLabel="Cor padrão (azul)"
            accessibilityState={{ selected: !accent }}
          >
            <View style={[styles.accentSwatch, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.accentLabel}>Default</Text>
          </TouchableOpacity>
          {ACCENT_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setAccent(c as AccentColor)}
              style={[
                styles.accentOption,
                accent === c && styles.accentSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Cor ${c}`}
              accessibilityState={{ selected: accent === c }}
            >
              <View style={[styles.accentSwatch, { backgroundColor: c }]} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(palette: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg.primary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: palette.bg.card,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: palette.bg.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 17, fontWeight: '700', color: palette.text.primary },
    content: { padding: 16, paddingBottom: 40 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.text.secondary,
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    note: { fontSize: 12, color: palette.text.muted, marginBottom: 10 },
    card: {
      backgroundColor: palette.bg.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border.subtle,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: palette.border.subtle },
    rowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: palette.text.primary },
    accentGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    accentOption: {
      alignItems: 'center',
      padding: 8,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    accentSelected: { borderColor: palette.primary.start },
    accentSwatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    accentLabel: { fontSize: 10, color: palette.text.muted, marginTop: 4 },
  });
}
