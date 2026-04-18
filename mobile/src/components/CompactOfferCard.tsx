import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ProgramLogo } from './ProgramLogo';
import { Colors } from '../lib/theme';
import type { Offer, Classification } from '../types';

const CLASSIFICATION_COLOR: Record<Classification, string> = {
  IMPERDIVEL: Colors.green.primary,
  BOA: Colors.yellow.primary,
  NORMAL: Colors.red.primary,
};

interface CompactOfferCardProps {
  offer: Offer;
}

export function CompactOfferCard({ offer }: CompactOfferCardProps) {
  const cpmColor = CLASSIFICATION_COLOR[offer.classification] ?? Colors.text.secondary;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/offer/${offer.id}`)}
    >
      <ProgramLogo slug={offer.program?.slug ?? ''} size={36} />
      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={1}>
          {offer.title}
        </Text>
        <Text style={styles.programName} numberOfLines={1}>
          {offer.program?.name ?? ''}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.cpmValue, { color: cpmColor }]}>
          R${offer.cpm.toFixed(2)}
        </Text>
        <Text style={styles.cpmLabel}>CPM</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  middle: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  programName: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  cpmValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  cpmLabel: {
    fontSize: 10,
    color: Colors.text.muted,
    marginTop: 1,
  },
});
