import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth.store';
import { useProfile, useUpdateBalances } from '../../src/hooks/useProfile';
import { usePrograms } from '../../src/hooks/usePrograms';
import { PlanBadge } from '../../src/components/PlanBadge';
import { MilesInput } from '../../src/components/MilesInput';
import { Colors } from '../../src/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  showChevron?: boolean;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const updateBalances = useUpdateBalances();

  const [balances, setBalances] = useState<Record<string, number>>({});
  const [balancesInitialized, setBalancesInitialized] = useState(false);

  const profile = profileData?.user ?? user;
  const milesBalances = profileData?.milesBalances ?? [];

  // Initialize balances from profile data
  if (!balancesInitialized && milesBalances.length > 0) {
    const initial: Record<string, number> = {};
    milesBalances.forEach((b) => {
      initial[b.programId] = b.balance;
    });
    setBalances(initial);
    setBalancesInitialized(true);
  }

  const plan = profile?.plan ?? 'FREE';
  const name = profile?.name ?? 'Usuário';
  const email = profile?.email ?? '';
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSaveBalances = async () => {
    const balancePayload = Object.entries(balances).map(([programId, balance]) => ({
      programId,
      balance,
    }));
    try {
      await updateBalances.mutateAsync({ balances: balancePayload });
      Alert.alert('Sucesso', 'Saldo de milhas atualizado!');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o saldo. Tente novamente.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  };

  // Menu focado em milhas. Removidas entradas que viraram tabs (Carteira,
  // Calculadora) ou que pertencem ao mundo de viagens (Explorar,
  // Histórico de Preços, Milhas vs Dinheiro). Voltam quando a feature
  // de simulador for repriorizada.
  const menuItems: MenuItem[] = [
    {
      icon: 'trending-up-outline',
      label: 'Oportunidades de arbitragem',
      showChevron: true,
      onPress: () => router.push('/arbitrage' as any),
    },
    {
      icon: 'trophy-outline',
      label: 'Ranking de Reporters',
      showChevron: true,
      onPress: () => router.push('/leaderboard' as any),
    },
    {
      icon: 'megaphone-outline',
      label: 'Reportar um bônus',
      showChevron: true,
      onPress: () => router.push('/report-bonus' as any),
    },
    {
      icon: 'people-outline',
      label: 'Família',
      showChevron: true,
      onPress: () => router.push('/family'),
    },
    {
      icon: 'swap-horizontal-outline',
      label: 'Transferências',
      showChevron: true,
      onPress: () => router.push('/transfers'),
    },
    {
      icon: 'notifications-outline',
      label: 'Notificações',
      showChevron: true,
      onPress: () => router.push('/notification-settings' as any),
    },
    {
      icon: 'gift-outline',
      label: 'Indique e ganhe Premium',
      showChevron: true,
      onPress: () => router.push('/referral' as any),
    },
    {
      icon: 'trophy-outline',
      label: 'Missões',
      showChevron: true,
      onPress: () => router.push('/missions' as any),
    },
    {
      icon: 'settings-outline',
      label: 'Preferências',
      showChevron: true,
      onPress: () => router.push('/preferences' as any),
    },
    {
      icon: 'book-outline',
      label: 'Artigos e Guias',
      showChevron: true,
      onPress: () => router.push('/articles'),
    },
    {
      icon: 'shield-outline',
      label: 'Política de Privacidade',
      showChevron: true,
      onPress: () =>
        Linking.openURL('https://milhasextras.com.br/privacidade').catch(() => {}),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar & user info */}
        <View style={styles.topSection}>
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          {profileLoading ? (
            <ActivityIndicator color="#3B82F6" style={{ marginTop: 12 }} />
          ) : (
            <>
              <Text style={styles.userName}>{name}</Text>
              <Text style={styles.userEmail}>{email}</Text>
              <View style={styles.planBadgeContainer}>
                <PlanBadge plan={plan} />
              </View>
            </>
          )}
        </View>

        {/* Upgrade banner */}
        {plan === 'FREE' && (
          <TouchableOpacity
            onPress={() => router.push('/subscription')}
            activeOpacity={0.85}
            style={styles.upgradeBannerOuter}
          >
            <LinearGradient
              colors={['#4338CA', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeBanner}
            >
            <View style={styles.upgradeContent}>
              <View style={styles.upgradeTitleRow}>
                <Ionicons name="rocket-outline" size={18} color="#fff" />
                <Text style={styles.upgradeTitle}>Assinar Premium</Text>
              </View>
              <Text style={styles.upgradeDesc}>
                Alertas em tempo real, histórico completo e muito mais
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#c7d2fe" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Miles balance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saldo de Milhas</Text>
          {programsLoading ? (
            <ActivityIndicator color="#3B82F6" style={styles.sectionLoader} />
          ) : (
            <>
              {programs?.map((p) => (
                <MilesInput
                  key={p.id}
                  programId={p.id}
                  programName={p.name}
                  programSlug={p.slug}
                  balance={balances[p.id] ?? 0}
                  onChange={(value) =>
                    setBalances((prev) => ({ ...prev, [p.id]: value }))
                  }
                />
              ))}
              <TouchableOpacity
                style={[
                  styles.saveButtonOuter,
                  updateBalances.isPending && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveBalances}
                activeOpacity={0.85}
                disabled={updateBalances.isPending}
              >
                <LinearGradient
                  colors={['#3B82F6', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButton}
                >
                  {updateBalances.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Salvar Saldo</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <Ionicons name={item.icon} size={18} color={Colors.text.secondary} />
                    </View>
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                  </View>
                  {item.showChevron && (
                    <Ionicons name="chevron-forward" size={16} color={Colors.text.muted} />
                  )}
                </TouchableOpacity>
                {index < menuItems.length - 1 && <View style={styles.menuDivider} />}
              </React.Fragment>
            ))}
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.red.primary} />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Milhas Extras v2.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  topSection: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.card,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 10,
  },
  planBadgeContainer: {
    marginTop: 4,
  },
  upgradeBannerOuter: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  upgradeDesc: {
    fontSize: 13,
    color: '#c7d2fe',
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionLoader: {
    marginVertical: 20,
    alignSelf: 'center',
  },
  saveButtonOuter: {
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  menuCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border.subtle,
    marginHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: 14,
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  logoutText: {
    fontSize: 15,
    color: Colors.red.primary,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: Colors.border.subtle,
    fontSize: 12,
    marginTop: 16,
    paddingBottom: 8,
  },
});
