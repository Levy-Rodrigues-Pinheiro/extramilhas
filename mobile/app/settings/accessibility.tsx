import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/lib/ThemeProvider';

/**
 * Tela dedicada a a11y. Toggles + slider de font scale.
 * Preview em tempo real — user vê a mudança imediata antes de sair.
 *
 * Nota: Slider vem de @react-native-community/slider; se não instalado,
 * degrade pra 3 botões (0.8x / 1x / 1.5x).
 */
export default function AccessibilityScreen() {
  const { t } = useTranslation();
  const {
    palette,
    highContrast,
    fontScale,
    dyslexiaMode,
    setHighContrast,
    setFontScale,
    setDyslexiaMode,
    reset,
  } = useTheme();

  const styles = makeStyles(palette, fontScale);

  const fontScalePresets = [0.85, 1.0, 1.15, 1.35, 1.6, 1.85];

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
        <Text style={styles.title}>Acessibilidade</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Font scale */}
        <Text style={styles.sectionTitle}>Tamanho do texto</Text>
        <View style={styles.card}>
          <Text style={styles.previewText}>
            Este é um texto de exemplo pra você ver o tamanho escolhido.
          </Text>
        </View>
        <Text style={styles.scaleLabel}>
          Atual: {Math.round(fontScale * 100)}%
        </Text>
        <View style={styles.presetRow}>
          {fontScalePresets.map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setFontScale(v)}
              style={[
                styles.presetBtn,
                fontScale === v && styles.presetBtnActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: fontScale === v }}
              accessibilityLabel={`${Math.round(v * 100)} por cento`}
            >
              <Text
                style={[
                  styles.presetText,
                  fontScale === v && styles.presetTextActive,
                ]}
              >
                {Math.round(v * 100)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Toggles */}
        <Text style={styles.sectionTitle}>Preferências visuais</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Ionicons name="contrast" size={18} color={palette.primary.light} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Alto contraste</Text>
              <Text style={styles.rowDesc}>
                Preto/branco sólidos pra legibilidade máxima (WCAG AAA)
              </Text>
            </View>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              accessibilityLabel="Alto contraste"
              trackColor={{ false: palette.border.default, true: palette.primary.start }}
            />
          </View>

          <View style={[styles.row, styles.rowDividerTop]}>
            <View style={styles.rowIcon}>
              <Ionicons name="text" size={18} color={palette.primary.light} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Modo dislexia</Text>
              <Text style={styles.rowDesc}>
                Espaçamento de letras aumentado + peso reforçado
              </Text>
            </View>
            <Switch
              value={dyslexiaMode}
              onValueChange={setDyslexiaMode}
              accessibilityLabel="Modo dislexia"
              trackColor={{ false: palette.border.default, true: palette.primary.start }}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Restaurar padrões',
              'Volta todas as preferências de tema e acessibilidade pros valores originais?',
              [
                { text: t('common.cancel'), style: 'cancel' },
                { text: 'Restaurar', style: 'destructive', onPress: reset },
              ],
            );
          }}
          style={styles.resetBtn}
          accessibilityRole="button"
          accessibilityLabel="Restaurar padrões"
        >
          <Text style={styles.resetText}>Restaurar padrões</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(palette: any, fontScale: number) {
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
    card: {
      backgroundColor: palette.bg.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border.subtle,
      overflow: 'hidden',
    },
    previewText: {
      padding: 16,
      fontSize: 14 * fontScale,
      lineHeight: 20 * fontScale,
      color: palette.text.primary,
    },
    scaleLabel: {
      fontSize: 11,
      color: palette.text.muted,
      textAlign: 'center',
      marginVertical: 10,
      fontWeight: '600',
    },
    scaleTicks: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    tickText: { fontSize: 9, color: palette.text.muted },
    presetRow: {
      flexDirection: 'row',
      gap: 6,
      marginVertical: 8,
      flexWrap: 'wrap',
    },
    presetBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border.default,
      backgroundColor: palette.bg.card,
    },
    presetBtnActive: {
      borderColor: palette.primary.start,
      backgroundColor: palette.primary.muted,
    },
    presetText: { fontSize: 12, fontWeight: '600', color: palette.text.secondary },
    presetTextActive: { color: palette.primary.light },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
    },
    rowDividerTop: { borderTopWidth: 1, borderTopColor: palette.border.subtle },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: palette.primary.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 14, fontWeight: '700', color: palette.text.primary },
    rowDesc: { fontSize: 11, color: palette.text.secondary, marginTop: 2, lineHeight: 15 },
    resetBtn: {
      marginTop: 20,
      padding: 12,
      alignItems: 'center',
    },
    resetText: { fontSize: 13, color: palette.red.primary, fontWeight: '600' },
  });
}
