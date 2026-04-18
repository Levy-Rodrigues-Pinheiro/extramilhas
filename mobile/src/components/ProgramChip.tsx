import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Colors } from '../lib/theme';

const PROGRAM_COLORS: Record<string, string> = {
  smiles: '#FF6B00',
  livelo: '#C41E3A',
  tudoazul: '#0033A0',
  latampass: '#E31837',
  esfera: '#00A651',
  multiplus: '#6B21A8',
};

interface ProgramChipProps {
  label: string;
  slug?: string;
  selected: boolean;
  onPress: () => void;
}

export function ProgramChip({ label, slug, selected, onPress }: ProgramChipProps) {
  const isTodos = !slug;
  const programColor = isTodos ? '#818CF8' : (PROGRAM_COLORS[slug] ?? '#6366f1');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.chip,
        selected && {
          backgroundColor: programColor + '26',
          borderWidth: 1.5,
          borderColor: programColor + '66',
        },
      ]}
    >
      <View style={styles.content}>
        {selected && (
          <View style={[styles.dot, { backgroundColor: programColor }]} />
        )}
        <Text
          style={[
            styles.label,
            selected && { color: Colors.text.primary },
          ]}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 0,
    backgroundColor: Colors.bg.card,
    marginRight: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
