import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { ProgramLogo } from './ProgramLogo';

interface MilesInputProps {
  programId: string;
  programName: string;
  programSlug: string;
  balance: number;
  onChange: (value: number) => void;
}

export function MilesInput({
  programName,
  programSlug,
  balance,
  onChange,
}: MilesInputProps) {
  const [focused, setFocused] = useState(false);

  const formatNumber = (n: number) =>
    n.toLocaleString('pt-BR');

  const handleChange = (text: string) => {
    const clean = text.replace(/\D/g, '');
    onChange(parseInt(clean || '0', 10));
  };

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      <ProgramLogo slug={programSlug} size={36} />
      <View style={styles.info}>
        <Text style={styles.programName}>{programName}</Text>
        <Text style={styles.balanceLabel}>Saldo de milhas</Text>
      </View>
      <TextInput
        style={styles.input}
        value={balance > 0 ? formatNumber(balance) : ''}
        onChangeText={handleChange}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#475569"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141C2F',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#253349',
    gap: 12,
  },
  containerFocused: {
    borderColor: '#818CF8',
  },
  info: {
    flex: 1,
  },
  programName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
  },
  balanceLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  input: {
    fontSize: 16,
    fontWeight: '700',
    color: '#818CF8',
    textAlign: 'right',
    minWidth: 80,
  },
});
