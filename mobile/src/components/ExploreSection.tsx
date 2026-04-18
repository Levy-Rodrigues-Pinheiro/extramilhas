import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../lib/theme';
import { CompactOfferCard } from './CompactOfferCard';
import type { Offer } from '../types';

interface ExploreSectionProps {
  title: string;
  icon: string;
  offers: Offer[];
}

export function ExploreSection({ title, icon, offers }: ExploreSectionProps) {
  if (offers.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={Colors.primary.light}
          />
          <Text style={styles.title}>{title}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.seeAll}>Ver todos &gt;</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={offers}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
        renderItem={({ item }) => <CompactOfferCard offer={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.primary.light,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
  },
});
