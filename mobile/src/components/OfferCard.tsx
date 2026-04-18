import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Offer, Classification } from '../types';
import { ProgramLogo } from './ProgramLogo';
import { ClassificationBadge } from './ClassificationBadge';
import { CountdownTimer } from './CountdownTimer';
import { Colors, Gradients, Shadows, Radius } from '../lib/theme';

// ─── Program color strip mapping ────────────────────────────────────────────
const PROGRAM_COLORS: Record<string, string> = {
  smiles: Colors.program.smiles,
  livelo: Colors.program.livelo,
  tudoazul: Colors.program.tudoazul,
  latampass: Colors.program.latampass,
  esfera: Colors.program.esfera,
  multiplus: Colors.program.multiplus,
};

// ─── CPM classification colors ──────────────────────────────────────────────
const CPM_COLOR: Record<string, string> = {
  IMPERDIVEL: Colors.green.primary,
  BOA: Colors.yellow.primary,
  NORMAL: Colors.red.primary,
};

// ─── Classification-based card styling ──────────────────────────────────────
function getClassificationStyle(classification: Classification): ViewStyle {
  switch (classification) {
    case 'IMPERDIVEL':
      return {
        borderWidth: 1.5,
        borderColor: Colors.green.primary,
        shadowColor: Colors.green.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
      };
    case 'BOA':
      return {
        borderWidth: 1,
        borderColor: Colors.yellow.border,
      };
    case 'NORMAL':
    default:
      return {};
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface OfferCardProps {
  offer: Offer;
  onSave?: (offerId: string) => void;
}

export function OfferCard({ offer, onSave }: OfferCardProps) {
  const cpmColor = CPM_COLOR[offer.classification] ?? Colors.text.secondary;
  const programColor =
    PROGRAM_COLORS[offer.program?.slug?.toLowerCase() ?? ''] ??
    Colors.primary.solid;

  const handlePress = () => {
    router.push(`/offer/${offer.id}`);
  };

  const handleViewOffer = () => {
    Linking.openURL(offer.sourceUrl).catch(() => {});
  };

  const handleSave = () => {
    onSave?.(offer.id);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[
        styles.card,
        getClassificationStyle(offer.classification),
      ]}
    >
      {/* Program color strip */}
      <View
        style={[
          styles.programStrip,
          { backgroundColor: programColor },
        ]}
      />

      {/* Header */}
      <View style={styles.header}>
        <ProgramLogo slug={offer.program?.slug ?? ''} size={42} />
        <View style={styles.headerText}>
          <Text style={styles.programName}>
            {offer.program?.name ?? 'Programa'}
          </Text>
          <Text style={styles.offerType}>{formatType(offer.type)}</Text>
        </View>
        <View
          style={[
            styles.cpmBadge,
            { backgroundColor: `${cpmColor}18` },
          ]}
        >
          <Text style={[styles.cpmValue, { color: cpmColor }]}>
            R${Number(offer.cpm).toFixed(2)}
          </Text>
          <Text style={styles.cpmLabel}>/1k mi</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {offer.title}
      </Text>

      {/* Classification + countdown */}
      <View style={styles.classificationRow}>
        <ClassificationBadge classification={offer.classification} size="sm" />
        {offer.expiresAt && (
          <View style={styles.countdown}>
            <Ionicons
              name="time-outline"
              size={12}
              color={Colors.text.secondary}
            />
            <CountdownTimer expiresAt={offer.expiresAt} compact />
          </View>
        )}
      </View>

      {/* Footer actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Ionicons
            name={offer.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={offer.isSaved ? Colors.primary.light : Colors.text.secondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleViewOffer}
          activeOpacity={0.8}
          style={styles.viewButtonTouchable}
        >
          <LinearGradient
            colors={[Gradients.primary[0], Gradients.primary[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.viewButtonGradient}
          >
            <Text style={styles.viewButtonText}>Ver Oferta</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.text.primary} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatType(type: string) {
  const map: Record<string, string> = {
    PURCHASE: 'Compra de Milhas',
    TRANSFER_BONUS: 'Bônus de Transferência',
    AWARD_DISCOUNT: 'Desconto em Resgate',
    PROMO: 'Promoção',
    COMPRA: 'Compra de Milhas',
    TRANSFERENCIA: 'Transferência',
    PASSAGEM: 'Passagem Aérea',
  };
  return map[type] ?? type;
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: Radius.xl,
    padding: 16,
    paddingLeft: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    ...Shadows.card,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },

  // Vertical program color strip
  programStrip: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 1.5,
  },

  // Header row
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  programName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  offerType: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },

  // CPM badge — prominent, colored background at 10% opacity
  cpmBadge: {
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cpmValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  cpmLabel: {
    fontSize: 9,
    color: Colors.text.secondary,
    marginTop: 1,
  },

  // Title
  title: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
    marginBottom: 10,
    fontWeight: '500',
  },

  // Classification row
  classificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Bookmark / save button
  saveButton: {
    padding: 10,
    backgroundColor: Colors.bg.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },

  // "Ver Oferta" button — gradient child inside transparent touchable
  viewButtonTouchable: {
    borderRadius: Radius.md,
    overflow: 'hidden' as const,
  },
  viewButtonGradient: {
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
});
