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

/**
 * Hub de settings. Agrupa Aparência, Acessibilidade, Notificações, Privacidade.
 * Cada item navega pra tela dedicada.
 */
type IoniconName = keyof typeof Ionicons.glyphMap;

interface SettingItem {
  icon: IoniconName;
  label: string;
  desc?: string;
  onPress: () => void;
}

export default function SettingsIndexScreen() {
  const { t } = useTranslation();
  const { palette, mode, highContrast, fontScale, dyslexiaMode } = useTheme();
  const styles = makeStyles(palette);

  const items: SettingItem[] = [
    {
      icon: 'color-palette-outline',
      label: 'Aparência',
      desc: `${mode === 'dark' ? 'Escuro' : mode === 'light' ? 'Claro' : 'Sistema'}`,
      onPress: () => router.push('/settings/theme' as any),
    },
    {
      icon: 'accessibility-outline',
      label: 'Acessibilidade',
      desc: `${Math.round(fontScale * 100)}%${highContrast ? ' · Alto contraste' : ''}${dyslexiaMode ? ' · Dislexia' : ''}`,
      onPress: () => router.push('/settings/accessibility' as any),
    },
    {
      icon: 'notifications-outline',
      label: 'Notificações',
      desc: 'Push, WhatsApp, email',
      onPress: () => router.push('/notification-settings' as any),
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Segurança',
      desc: 'Biometria, 2FA, sessões ativas',
      onPress: () => router.push('/security' as any),
    },
    {
      icon: 'options-outline',
      label: 'Preferências',
      desc: 'Programas favoritos, CPM alvo',
      onPress: () => router.push('/preferences' as any),
    },
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
        <Text style={styles.title}>Configurações</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {items.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.row}
                onPress={item.onPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name={item.icon} size={18} color={palette.primary.light} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  {item.desc && <Text style={styles.rowDesc}>{item.desc}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color={palette.text.muted} />
              </TouchableOpacity>
              {i < items.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
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
    content: { padding: 16 },
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
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
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
    rowDesc: { fontSize: 11, color: palette.text.muted, marginTop: 2 },
    divider: {
      height: 1,
      backgroundColor: palette.border.subtle,
      marginLeft: 62,
    },
  });
}
