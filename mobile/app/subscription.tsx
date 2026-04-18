import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription, useSubscriptionPlans, useSubscribePlan } from '../src/hooks/useSubscription';
import { useAuthStore } from '../src/store/auth.store';
import { Colors } from '../src/lib/theme';

interface PlanFeatureRow {
  label: string;
  free: boolean;
  premium: boolean;
  pro: boolean;
}

const FEATURES: PlanFeatureRow[] = [
  { label: 'Ofertas em tempo real', free: false, premium: true, pro: true },
  { label: 'Alertas ilimitados', free: false, premium: true, pro: true },
  { label: 'Histórico completo', free: false, premium: true, pro: true },
  { label: 'Simulador avançado', free: false, premium: true, pro: true },
  { label: 'Artigos exclusivos', free: false, premium: false, pro: true },
  { label: 'Suporte prioritário', free: false, premium: false, pro: true },
  { label: 'API de dados', free: false, premium: false, pro: true },
];

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons
        name={included ? 'checkmark-circle' : 'close-circle-outline'}
        size={18}
        color={included ? '#22c55e' : '#475569'}
      />
      <Text style={[styles.featureLabel, !included && styles.featureLabelDisabled]}>
        {label}
      </Text>
    </View>
  );
}

export default function SubscriptionScreen() {
  const { data: currentSub } = useSubscription();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const subscribePlan = useSubscribePlan();
  const { user } = useAuthStore();

  const currentPlan: string = user?.plan ?? 'FREE';

  const handleSubscribe = async (planName: 'PREMIUM' | 'PRO') => {
    const planDetails = plans?.find((p) => p.name === planName);
    if (!planDetails) {
      Alert.alert('Erro', 'Plano não encontrado.');
      return;
    }

    Alert.alert(
      `Assinar ${planName === 'PREMIUM' ? 'Premium' : 'Pro'}`,
      `Confirmar assinatura do plano ${planName === 'PREMIUM' ? 'Premium (R$19,90/mês)' : 'Pro (R$39,90/mês)'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await subscribePlan.mutateAsync(planDetails.id);
              Alert.alert('Sucesso!', 'Assinatura ativada com sucesso.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch {
              Alert.alert('Erro', 'Não foi possível processar a assinatura. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assinar Milhas Extras</Text>
        <View style={styles.headerSpacer} />
      </View>

      {plansLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Escolha seu plano</Text>
          <Text style={styles.pageSubtitle}>
            Acesse todas as ofertas e alertas em tempo real
          </Text>

          {/* FREE Plan */}
          <View style={[styles.planCard, styles.planCardFree]}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Gratuito</Text>
              <View style={styles.planPriceRow}>
                <Text style={styles.planPrice}>R$0</Text>
                <Text style={styles.planPeriod}>/mês</Text>
              </View>
            </View>
            <View style={styles.featureList}>
              {FEATURES.map((f) => (
                <FeatureRow key={f.label} label={f.label} included={f.free} />
              ))}
            </View>
            {currentPlan === 'FREE' && (
              <View style={styles.currentPlanBadge}>
                <Text style={styles.currentPlanText}>Plano atual</Text>
              </View>
            )}
          </View>

          {/* PREMIUM Plan */}
          <View style={[styles.planCard, styles.planCardPremium]}>
            <View style={styles.popularBadge}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.popularText}>Mais Popular</Text>
            </View>
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: '#818cf8' }]}>Premium</Text>
              <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, { color: '#f8fafc' }]}>R$19,90</Text>
                <Text style={styles.planPeriod}>/mês</Text>
              </View>
            </View>
            <View style={styles.featureList}>
              {FEATURES.map((f) => (
                <FeatureRow key={f.label} label={f.label} included={f.premium} />
              ))}
            </View>
            {currentPlan === 'PREMIUM' ? (
              <View style={[styles.currentPlanBadge, { backgroundColor: '#1e1b4b' }]}>
                <Text style={[styles.currentPlanText, { color: '#818cf8' }]}>Plano atual</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.subscribeButtonOuter, subscribePlan.isPending && styles.subscribeButtonDisabled]}
                onPress={() => handleSubscribe('PREMIUM')}
                activeOpacity={0.85}
                disabled={subscribePlan.isPending || currentPlan === 'PREMIUM'}
              >
                <LinearGradient
                  colors={['#3B82F6', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.subscribeButton}
                >
                  {subscribePlan.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.subscribeButtonText}>Assinar Premium</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* PRO Plan */}
          <View style={[styles.planCard, styles.planCardPro]}>
            <View style={styles.planHeader}>
              <View style={styles.proPlanTitleRow}>
                <Text style={[styles.planName, { color: '#a78bfa' }]}>Pro</Text>
                <View style={styles.proAllIncludedBadge}>
                  <Text style={styles.proAllIncludedText}>Tudo incluído</Text>
                </View>
              </View>
              <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, { color: '#f8fafc' }]}>R$39,90</Text>
                <Text style={styles.planPeriod}>/mês</Text>
              </View>
            </View>
            <View style={styles.featureList}>
              {FEATURES.map((f) => (
                <FeatureRow key={f.label} label={f.label} included={f.pro} />
              ))}
            </View>
            {currentPlan === 'PRO' ? (
              <View style={[styles.currentPlanBadge, { backgroundColor: '#2e1065' }]}>
                <Text style={[styles.currentPlanText, { color: '#a78bfa' }]}>Plano atual</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.subscribeButtonOuter,
                  subscribePlan.isPending && styles.subscribeButtonDisabled,
                ]}
                onPress={() => handleSubscribe('PRO')}
                activeOpacity={0.85}
                disabled={subscribePlan.isPending || currentPlan === 'PRO'}
              >
                <LinearGradient
                  colors={['#7C3AED', '#9333EA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.subscribeButton}
                >
                  {subscribePlan.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.subscribeButtonText}>Assinar Pro</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Skip link */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Continuar com plano gratuito</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#141C2F',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141C2F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#253349',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#141C2F',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#253349',
  },
  planCardFree: {
    opacity: 0.8,
  },
  planCardPremium: {
    borderColor: '#818CF8',
    borderWidth: 2,
    position: 'relative',
    paddingTop: 28,
  },
  planCardPro: {
    borderColor: '#7c3aed',
    borderWidth: 1.5,
  },
  popularBadge: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#818CF8',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  planHeader: {
    marginBottom: 16,
  },
  proPlanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  planName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#94a3b8',
  },
  proAllIncludedBadge: {
    backgroundColor: '#2e1065',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proAllIncludedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a78bfa',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    marginTop: 6,
  },
  planPrice: {
    fontSize: 30,
    fontWeight: '800',
    color: '#64748b',
  },
  planPeriod: {
    fontSize: 14,
    color: '#64748b',
  },
  featureList: {
    gap: 10,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureLabel: {
    fontSize: 14,
    color: '#f8fafc',
  },
  featureLabelDisabled: {
    color: '#475569',
    textDecorationLine: 'line-through',
  },
  subscribeButtonOuter: {},
  subscribeButton: {
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  currentPlanBadge: {
    backgroundColor: Colors.bg.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  currentPlanText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 14,
    color: '#64748b',
    textDecorationLine: 'underline',
  },
});
