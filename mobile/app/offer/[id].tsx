import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useOffer, useSaveOffer, useUnsaveOffer } from '../../src/hooks/useOffers';
import { ProgramLogo } from '../../src/components/ProgramLogo';
import { ClassificationBadge } from '../../src/components/ClassificationBadge';
import { CountdownTimer } from '../../src/components/CountdownTimer';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/lib/theme';

const OFFER_TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Compra de Milhas',
  TRANSFER_BONUS: 'Bônus de Transferência',
  AWARD_DISCOUNT: 'Desconto em Resgate',
  PROMO: 'Promoção',
  COMPRA: 'Compra de Milhas',
  TRANSFERENCIA: 'Transferência de Pontos',
  PASSAGEM: 'Passagem Aérea',
};

const CLASSIFICATION_DIFF_COLOR: Record<string, string> = {
  IMPERDIVEL: '#10B981',
  BOA: '#F59E0B',
  NORMAL: '#ef4444',
};

export default function OfferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: offer, isLoading, isError } = useOffer(id ?? '');
  const saveOffer = useSaveOffer();
  const unsaveOffer = useUnsaveOffer();

  const handleOpenOffer = () => {
    const url = offer?.sourceUrl;
    if (!url) return;
    Linking.openURL(url).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o link da oferta.')
    );
  };

  const handleToggleSave = () => {
    if (!offer) return;
    if (offer.isSaved) {
      unsaveOffer.mutate(offer.id);
    } else {
      saveOffer.mutate(offer.id);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Carregando oferta...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !offer) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </TouchableOpacity>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Oferta não encontrada"
          description="Esta oferta pode ter expirado ou não está mais disponível."
        />
      </SafeAreaView>
    );
  }

  const diffColor = CLASSIFICATION_DIFF_COLOR[offer.classification] ?? '#94a3b8';
  const avgCpm = offer.program?.averageCpm30d ?? 0;
  const diffPercent =
    avgCpm > 0 ? Math.round(((avgCpm - offer.cpm) / avgCpm) * 100) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Detalhes da Oferta
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Program info */}
        <View style={styles.programRow}>
          <ProgramLogo slug={offer.program?.slug ?? ''} size={52} />
          <View style={styles.programInfo}>
            <Text style={styles.programName}>{offer.program?.name ?? 'Programa'}</Text>
            <Text style={styles.offerType}>{OFFER_TYPE_LABELS[offer.type] ?? offer.type}</Text>
          </View>
        </View>

        {/* Classification badge */}
        <View style={styles.classificationContainer}>
          <ClassificationBadge classification={offer.classification} size="lg" />
        </View>

        {/* Title */}
        <Text style={styles.title}>{offer.title}</Text>

        {/* CPM card */}
        <View style={styles.cpmCard}>
          <View style={styles.cpmMain}>
            <Text style={styles.cpmLabel}>Custo por 1.000 milhas</Text>
            <Text style={[styles.cpmValue, { color: diffColor }]}>
              R$ {offer.cpm.toFixed(2)}
              <Text style={styles.cpmUnit}> / 1.000 mi</Text>
            </Text>
          </View>
          {diffPercent !== null && (
            <View style={[styles.diffBadge, { backgroundColor: diffPercent > 0 ? '#052e16' : '#450a0a' }]}>
              <Ionicons
                name={diffPercent > 0 ? 'trending-down' : 'trending-up'}
                size={14}
                color={diffPercent > 0 ? '#22c55e' : '#ef4444'}
              />
              <Text
                style={[
                  styles.diffText,
                  { color: diffPercent > 0 ? '#22c55e' : '#ef4444' },
                ]}
              >
                {Math.abs(diffPercent)}% {diffPercent > 0 ? 'abaixo' : 'acima'} da média
              </Text>
            </View>
          )}
          {avgCpm > 0 && (
            <Text style={styles.avgCpmText}>
              Média 30 dias: R$ {avgCpm.toFixed(2)}
            </Text>
          )}
        </View>

        {/* Description */}
        {offer.description ? (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionLabel}>Descrição</Text>
            <Text style={styles.descriptionText}>{offer.description}</Text>
          </View>
        ) : null}

        {/* Expiry countdown */}
        {offer.expiresAt && (
          <View style={styles.expiryCard}>
            <View style={styles.expiryHeader}>
              <Ionicons name="time-outline" size={16} color="#eab308" />
              <Text style={styles.expiryLabel}>Expira em:</Text>
            </View>
            <CountdownTimer expiresAt={offer.expiresAt} />
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Publicado em</Text>
            <Text style={styles.metaValue}>
              {new Date(offer.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
          <View style={[styles.metaRow, styles.metaRowLast]}>
            <Text style={styles.metaKey}>Status</Text>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: offer.isActive ? '#22c55e' : '#ef4444' },
                ]}
              />
              <Text style={[styles.statusText, { color: offer.isActive ? '#22c55e' : '#ef4444' }]}>
                {offer.isActive ? 'Ativa' : 'Encerrada'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.viewOfferButtonOuter, !offer.isActive && styles.viewOfferButtonDisabled]}
          onPress={handleOpenOffer}
          activeOpacity={0.85}
          disabled={!offer.isActive}
        >
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.viewOfferButton}
          >
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={styles.viewOfferText}>Ver Oferta</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bookmarkButton}
          onPress={handleToggleSave}
          activeOpacity={0.7}
        >
          {saveOffer.isPending || unsaveOffer.isPending ? (
            <ActivityIndicator size="small" color="#818CF8" />
          ) : (
            <Ionicons
              name={offer.isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={offer.isSaved ? '#818CF8' : '#94a3b8'}
            />
          )}
        </TouchableOpacity>
      </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 8,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  offerType: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  classificationContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    lineHeight: 28,
    marginBottom: 16,
  },
  cpmCard: {
    backgroundColor: '#141C2F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#253349',
  },
  cpmMain: {
    marginBottom: 10,
  },
  cpmLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: '500',
  },
  cpmValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  cpmUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  diffText: {
    fontSize: 13,
    fontWeight: '700',
  },
  avgCpmText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  descriptionCard: {
    backgroundColor: '#141C2F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#253349',
  },
  descriptionLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    color: '#f8fafc',
    lineHeight: 22,
  },
  expiryCard: {
    backgroundColor: '#422006',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#713f12',
  },
  expiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  expiryLabel: {
    fontSize: 13,
    color: '#eab308',
    fontWeight: '600',
  },
  metaCard: {
    backgroundColor: '#141C2F',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#253349',
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#253349',
  },
  metaRowLast: {
    borderBottomWidth: 0,
  },
  metaKey: {
    fontSize: 13,
    color: '#94a3b8',
  },
  metaValue: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#141C2F',
  },
  viewOfferButtonOuter: {
    flex: 1,
  },
  viewOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    height: 52,
  },
  viewOfferButtonDisabled: {
    opacity: 0.5,
  },
  viewOfferText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  bookmarkButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#141C2F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#253349',
  },
});
