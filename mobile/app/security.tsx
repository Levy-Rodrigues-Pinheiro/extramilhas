import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../src/lib/theme';

/**
 * Central de segurança.
 *   - Login por biometria (feat flag local; real requer expo-local-authentication
 *     instalado e compilado — bloqueado por quota EAS até 01/mai)
 *   - 2FA (coming soon — requer TOTP lib no backend)
 *   - Dispositivos conectados (implementado, roteia pra /active-sessions)
 *
 * As preferências ficam em AsyncStorage com prefixo `sec-pref-*`. Quando
 * biometria real for compilada, basta ler a mesma key e se true, disparar
 * LocalAuthentication.authenticateAsync no boot.
 */
export default function SecurityScreen() {
  const { t } = useTranslation();
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const bio = await AsyncStorage.getItem('sec-pref-biometrics');
        const twofa = await AsyncStorage.getItem('sec-pref-2fa');
        if (bio === '1') setBiometricsEnabled(true);
        if (twofa === '1') setTwoFactorEnabled(true);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const toggleBiometrics = async (v: boolean) => {
    if (v) {
      Alert.alert(
        t('profile.biometrics'),
        'Esta versão ainda não tem login por biometria compilado (aguardando build EAS do mobile). A preferência fica salva e ativa quando a próxima versão estiver disponível.',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: 'Salvar preferência',
            onPress: async () => {
              await AsyncStorage.setItem('sec-pref-biometrics', '1');
              setBiometricsEnabled(true);
            },
          },
        ],
      );
    } else {
      await AsyncStorage.removeItem('sec-pref-biometrics');
      setBiometricsEnabled(false);
    }
  };

  const toggle2FA = async (v: boolean) => {
    if (v) {
      Alert.alert(
        t('profile.two_factor'),
        'Verificação em 2 etapas via app autenticador virá em breve. Salvar preferência pra receber notificação quando estiver disponível?',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: 'Me avise',
            onPress: async () => {
              await AsyncStorage.setItem('sec-pref-2fa', '1');
              setTwoFactorEnabled(true);
            },
          },
        ],
      );
    } else {
      await AsyncStorage.removeItem('sec-pref-2fa');
      setTwoFactorEnabled(false);
    }
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
        <Text style={styles.title}>{t('profile.security')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Biometria */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Ionicons name="finger-print" size={20} color={Colors.primary.light} />
            </View>
            <View style={styles.info}>
              <Text style={styles.itemTitle}>{t('profile.biometrics')}</Text>
              <Text style={styles.itemDesc}>
                Login rápido com impressão digital ou Face ID (em breve).
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={toggleBiometrics}
              trackColor={{ false: Colors.border.default, true: Colors.primary.start }}
              accessibilityLabel={t('profile.biometrics')}
            />
          </View>
        </View>

        {/* 2FA */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary.light} />
            </View>
            <View style={styles.info}>
              <Text style={styles.itemTitle}>{t('profile.two_factor')}</Text>
              <Text style={styles.itemDesc}>
                Camada extra de segurança com código TOTP (em breve).
              </Text>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={toggle2FA}
              trackColor={{ false: Colors.border.default, true: Colors.primary.start }}
              accessibilityLabel={t('profile.two_factor')}
            />
          </View>
        </View>

        {/* Sessões ativas — navegável */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/active-sessions' as any)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t('profile.active_sessions')}
        >
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary.light} />
            </View>
            <View style={styles.info}>
              <Text style={styles.itemTitle}>{t('profile.active_sessions')}</Text>
              <Text style={styles.itemDesc}>
                Veja e desconecte dispositivos que acessam sua conta.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text.muted} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
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
  content: { padding: 16, gap: 10 },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  itemDesc: { fontSize: 11, color: Colors.text.secondary, lineHeight: 15 },
});
