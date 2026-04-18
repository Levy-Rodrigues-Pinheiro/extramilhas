import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useInfiniteOffers } from '../../src/hooks/useOffers';
import { useExpiringBalances } from '../../src/hooks/useProfile';
import { useAppStore } from '../../src/store/app.store';
import { OfferCard } from '../../src/components/OfferCard';
import { ProgramChip } from '../../src/components/ProgramChip';
import { ExpirationWarning } from '../../src/components/ExpirationWarning';
import { EmptyState } from '../../src/components/EmptyState';
import { OfferListSkeleton } from '../../src/components/LoadingSkeleton';
import { Colors, Gradients } from '../../src/lib/theme';
import type { Offer } from '../../src/types';

const PROGRAMS = [
  { label: 'Todos', slug: '' },
  { label: 'Smiles', slug: 'smiles' },
  { label: 'Livelo', slug: 'livelo' },
  { label: 'TudoAzul', slug: 'tudoazul' },
  { label: 'Latam Pass', slug: 'latampass' },
  { label: 'Esfera', slug: 'esfera' },
];

export default function HomeScreen() {
  const { selectedPrograms, searchQuery, toggleProgram, setSearchQuery, setSelectedPrograms } =
    useAppStore();

  const { data: expiringBalances } = useExpiringBalances();

  const [refreshing, setRefreshing] = useState(false);

  const filters = {
    programs: selectedPrograms.length > 0 ? selectedPrograms : undefined,
    search: searchQuery || undefined,
  };

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteOffers(filters);

  const rawOffers: Offer[] = data?.pages.flatMap((p) => p.data) ?? [];
  const allOffers = selectedPrograms.length > 0
    ? rawOffers.filter((o) => o.program?.slug && selectedPrograms.includes(o.program.slug))
    : rawOffers;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleProgramSelect = (slug: string) => {
    if (slug === '') {
      setSelectedPrograms([]);
    } else {
      toggleProgram(slug);
    }
  };

  const isProgramSelected = (slug: string) => {
    if (slug === '') return selectedPrograms.length === 0;
    return selectedPrograms.includes(slug);
  };

  const renderOffer = ({ item }: { item: Offer }) => (
    <OfferCard
      offer={item}
      onSave={(id) => router.push(`/offer/${id}`)}
    />
  );

  const renderHeader = () => (
    <View>
      {/* Expiring balances warning */}
      {expiringBalances && expiringBalances.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <ExpirationWarning balances={expiringBalances} />
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={Colors.text.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ofertas..."
          placeholderTextColor={Colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={Colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Program chips */}
      <FlatList
        data={PROGRAMS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.slug || 'all'}
        contentContainerStyle={styles.chipsContainer}
        renderItem={({ item }) => (
          <ProgramChip
            label={item.label}
            slug={item.slug || undefined}
            selected={isProgramSelected(item.slug)}
            onPress={() => handleProgramSelect(item.slug)}
          />
        )}
        style={styles.chipsList}
      />

      {/* Section title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ofertas disponíveis</Text>
        {allOffers.length > 0 && (
          <Text style={styles.sectionCount}>{allOffers.length} ofertas</Text>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return <OfferListSkeleton />;
    if (isError) {
      return (
        <EmptyState
          icon="wifi-outline"
          title="Erro ao carregar"
          description="Não foi possível carregar as ofertas. Verifique sua conexão e tente novamente."
        />
      );
    }
    return (
      <EmptyState
        icon="pricetag-outline"
        title="Nenhuma oferta encontrada"
        description="Tente ajustar os filtros ou volte mais tarde para novas ofertas."
      />
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingMore}>
        <Text style={styles.loadingMoreText}>Carregando mais...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.primary} />

      {/* Top header with gradient */}
      <LinearGradient
        colors={[Colors.bg.primary, Colors.bg.card]}
        style={styles.topHeader}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Milhas</Text>
          <Text style={styles.logoAccent}>Extras</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.7}
            onPress={() => router.push('/explore')}
          >
            <Ionicons name="compass-outline" size={20} color={Colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/alerts')}
          >
            <Ionicons name="notifications-outline" size={20} color={Colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.7}
            onPress={() => router.push('/alerts/create')}
          >
            <Ionicons name="options-outline" size={20} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={isLoading ? [] : allOffers}
        keyExtractor={(item) => item.id}
        renderItem={renderOffer}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary.start}
            colors={[Colors.primary.start]}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  logoAccent: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary.light,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 90,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    height: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    height: '100%',
  },
  chipsList: {
    marginVertical: 12,
  },
  chipsContainer: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  sectionCount: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
});
