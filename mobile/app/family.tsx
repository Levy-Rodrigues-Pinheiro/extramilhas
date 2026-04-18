import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFamily, useAddFamilyMember, useDeleteFamilyMember } from '../src/hooks/useFamily';
import { ProgramLogo } from '../src/components/ProgramLogo';
import { EmptyState } from '../src/components/EmptyState';
import { Colors, Gradients } from '../src/lib/theme';

export default function FamilyScreen() {
  const { data: members, isLoading, isError } = useFamily();
  const addMember = useAddFamilyMember();
  const deleteMember = useDeleteFamilyMember();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim() || !newRelationship.trim()) {
      Alert.alert('Atenção', 'Preencha o nome e o parentesco.');
      return;
    }
    try {
      await addMember.mutateAsync({ name: newName.trim(), relationship: newRelationship.trim() });
      setNewName('');
      setNewRelationship('');
      setShowAddForm(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar o membro. Tente novamente.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remover membro', `Deseja remover ${name} da família?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => deleteMember.mutate(id),
      },
    ]);
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const getTotalMiles = (balances: any[]) =>
    (balances ?? []).reduce((sum: number, b: any) => sum + (b.balance ?? 0), 0);

  const renderMember = ({ item }: { item: any }) => {
    const isExpanded = expandedId === item.id;
    const totalMiles = getTotalMiles(item.balances);

    return (
      <View style={styles.memberCard}>
        <TouchableOpacity
          style={styles.memberHeader}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.memberLeft}>
            <LinearGradient
              colors={Gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </LinearGradient>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{item.name}</Text>
              <Text style={styles.memberRelationship}>{item.relationship}</Text>
            </View>
          </View>
          <View style={styles.memberRight}>
            <Text style={styles.memberMiles}>
              {totalMiles.toLocaleString('pt-BR')} mi
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.text.muted}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.memberBalances}>
            {(item.balances ?? []).length > 0 ? (
              (item.balances ?? []).map((bal: any, idx: number) => (
                <View key={idx} style={styles.balanceRow}>
                  <View style={styles.balanceLeft}>
                    <ProgramLogo slug={bal.program?.slug ?? ''} size={24} />
                    <Text style={styles.balanceProgramName}>
                      {bal.program?.name ?? 'Programa'}
                    </Text>
                  </View>
                  <Text style={styles.balanceValue}>
                    {(bal.balance ?? 0).toLocaleString('pt-BR')} mi
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noBalances}>Nenhum saldo cadastrado</Text>
            )}

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id, item.name)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color={Colors.red.primary} />
              <Text style={styles.deleteText}>Remover</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Família</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(!showAddForm)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showAddForm ? 'close' : 'add'}
            size={22}
            color={Colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Add form */}
      {showAddForm && (
        <View style={styles.addForm}>
          <Text style={styles.addFormTitle}>Adicionar Membro</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor={Colors.text.muted}
              value={newName}
              onChangeText={setNewName}
            />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Parentesco (ex: Cônjuge, Filho, Mãe)"
              placeholderTextColor={Colors.text.muted}
              value={newRelationship}
              onChangeText={setNewRelationship}
            />
          </View>
          <TouchableOpacity
            style={styles.addMemberButton}
            onPress={handleAdd}
            activeOpacity={0.85}
            disabled={addMember.isPending}
          >
            <LinearGradient
              colors={Gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addMemberGradient}
            >
              {addMember.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addMemberText}>Adicionar</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.start} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Erro ao carregar"
          description="Não foi possível carregar os membros da família."
        />
      ) : (
        <FlatList
          data={members ?? []}
          keyExtractor={(item: any) => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Nenhum membro"
              description="Adicione membros da família para gerenciar milhas de todos em um só lugar."
            />
          }
        />
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
    borderBottomColor: Colors.bg.card,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginHorizontal: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  addForm: {
    backgroundColor: Colors.bg.card,
    margin: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    gap: 10,
  },
  addFormTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  inputContainer: {
    backgroundColor: Colors.bg.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  input: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.text.primary,
  },
  addMemberButton: {
    marginTop: 4,
  },
  addMemberGradient: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  memberCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    overflow: 'hidden',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  memberRelationship: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  memberMiles: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary.light,
  },
  memberBalances: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    padding: 14,
    gap: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceProgramName: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  noBalances: {
    fontSize: 13,
    color: Colors.text.muted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  deleteText: {
    fontSize: 13,
    color: Colors.red.primary,
    fontWeight: '600',
  },
});
