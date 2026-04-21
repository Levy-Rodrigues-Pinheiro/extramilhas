import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import api from '../src/lib/api';
import { Colors, Gradients } from '../src/lib/theme';

/**
 * Retrospectiva da semana estilo Spotify Wrapped.
 * Cards sequenciais com stats de engagement + share pro WhatsApp/IG.
 */
interface Retro {
  userName: string;
  weekStart: string;
  weekEnd: string;
  stats: {
    notificationsReceived: number;
    bonusAlertsReceived: number;
    missionsProgressed: number;
    currentStreak: number;
    longestStreak: number;
    walletTotalMiles: number;
    walletValueBrl: number;
  };
  topBonus: { from: string; to: string; bonusPercent: number } | null;
}

export default function RetrospectiveScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState<Retro | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/users/retrospective/weekly');
        setData(res.data as Retro);
      } catch {
        Alert.alert(t('common.error'), t('errors.generic'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = async () => {
    if (!data) return;
    const lines = [
      `📊 Minha semana no Milhas Extras:`,
      ``,
      `💰 Carteira: R$ ${data.stats.walletValueBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${data.stats.walletTotalMiles.toLocaleString('pt-BR')} mi)`,
      `🔔 ${data.stats.bonusAlertsReceived} bônus descobertos`,
      `🔥 ${data.stats.currentStreak} dias de streak`,
    ];
    if (data.topBonus) {
      lines.push(`🎁 Top: ${data.topBonus.bonusPercent}% ${data.topBonus.from}→${data.topBonus.to}`);
    }
    lines.push('');
    lines.push('Calcule sua carteira em R$ no Milhas Extras:');
    lines.push('https://milhasextras.com.br');
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      /* cancelou */
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
        <Text style={styles.title}>Sua semana</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary.light} />
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Text style={{ color: Colors.text.secondary }}>{t('errors.generic')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero */}
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroHi}>Olá, {data.userName}!</Text>
            <Text style={styles.heroTitle}>Sua semana</Text>
            <Text style={styles.heroDate}>
              {fmtDate(data.weekStart)} — {fmtDate(data.weekEnd)}
            </Text>
          </LinearGradient>

          {/* Wallet value */}
          <View style={styles.card}>
            <Text style={styles.cardEmoji}>💰</Text>
            <Text style={styles.cardValue}>
              R$ {data.stats.walletValueBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.cardLabel}>é quanto vale sua carteira</Text>
            <Text style={styles.cardSub}>
              {data.stats.walletTotalMiles.toLocaleString('pt-BR')} milhas acumuladas
            </Text>
          </View>

          {/* Bonuses received */}
          <View style={styles.card}>
            <Text style={styles.cardEmoji}>🎁</Text>
            <Text style={styles.cardValue}>{data.stats.bonusAlertsReceived}</Text>
            <Text style={styles.cardLabel}>
              {data.stats.bonusAlertsReceived === 1 ? 'bônus descoberto' : 'bônus descobertos'}
            </Text>
            <Text style={styles.cardSub}>
              {data.stats.notificationsReceived} notificações recebidas no total
            </Text>
          </View>

          {/* Streak */}
          <View style={styles.card}>
            <Text style={styles.cardEmoji}>🔥</Text>
            <Text style={styles.cardValue}>{data.stats.currentStreak}d</Text>
            <Text style={styles.cardLabel}>de streak ativo</Text>
            <Text style={styles.cardSub}>
              Recorde pessoal: {data.stats.longestStreak}d
            </Text>
          </View>

          {/* Top bonus */}
          {data.topBonus && (
            <View style={[styles.card, { borderColor: Colors.primary.start }]}>
              <Text style={styles.cardEmoji}>⚡</Text>
              <Text style={styles.cardValue}>+{data.topBonus.bonusPercent}%</Text>
              <Text style={styles.cardLabel}>
                {data.topBonus.from} → {data.topBonus.to}
              </Text>
              <Text style={styles.cardSub}>Top bônus da semana. Corre e aproveita!</Text>
            </View>
          )}

          {/* Missions */}
          {data.stats.missionsProgressed > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardEmoji}>🎯</Text>
              <Text style={styles.cardValue}>{data.stats.missionsProgressed}</Text>
              <Text style={styles.cardLabel}>missões progrediram</Text>
              <Text style={styles.cardSub}>Continue assim pra ganhar Premium grátis</Text>
            </View>
          )}

          {/* Share */}
          <TouchableOpacity
            onPress={share}
            style={styles.shareBtn}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar retrospectiva"
          >
            <LinearGradient
              colors={Gradients.primary as unknown as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareGradient}
            >
              <Ionicons name="share-social" size={18} color="#fff" />
              <Text style={styles.shareText}>Compartilhar minha semana</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 14,
    alignItems: 'center',
  },
  heroHi: { color: '#fff', fontSize: 14, opacity: 0.9 },
  heroTitle: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  heroDate: { color: '#fff', fontSize: 12, opacity: 0.85, marginTop: 6 },
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    alignItems: 'center',
    marginBottom: 10,
  },
  cardEmoji: { fontSize: 28, marginBottom: 6 },
  cardValue: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.primary.light,
    marginBottom: 2,
  },
  cardLabel: { fontSize: 13, color: Colors.text.primary, fontWeight: '600' },
  cardSub: { fontSize: 11, color: Colors.text.muted, marginTop: 4, textAlign: 'center' },
  shareBtn: { marginTop: 20 },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
  },
  shareText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
