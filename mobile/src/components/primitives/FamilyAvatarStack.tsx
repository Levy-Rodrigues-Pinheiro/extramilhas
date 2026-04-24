/**
 * FamilyAvatarStack — overlapping circles estilo Apple Family Sharing.
 *
 * Cada avatar: círculo gradient com initial + border branco sobreposto.
 * Overlaps em -10px pra dar profundidade. Último fica "+N" se limit excedido.
 *
 * Uso:
 *   <FamilyAvatarStack
 *     members={[{id: '1', name: 'Alice'}, {id: '2', name: 'Bob'}]}
 *     size={40}
 *     max={4}
 *   />
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { aurora, premium, semantic, text as textTokens } from '../../design/tokens';

type Member = {
  id: string;
  name: string;
  /** Custom color override (default calcula do nome) */
  color?: string;
};

type Props = {
  members: Member[];
  size?: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
};

// Paleta cíclica pra cores consistentes por nome
const AVATAR_GRADIENTS: Array<[string, string]> = [
  [aurora.cyan, aurora.iris],
  [aurora.magenta, aurora.iris],
  [premium.goldLight, premium.goldDark],
  [semantic.success, '#66E88A'],
  ['#FF6961', semantic.danger],
  [aurora.cyan, aurora.magenta],
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function FamilyAvatarStack({ members, size = 40, max = 5, style }: Props) {
  const visible = members.slice(0, max);
  const remaining = members.length - visible.length;

  const overlap = Math.round(size * 0.3);
  const border = 2;

  return (
    <View style={[styles.wrap, style]}>
      {visible.map((m, i) => {
        const gradIndex = hashName(m.name) % AVATAR_GRADIENTS.length;
        const gradient = AVATAR_GRADIENTS[gradIndex];
        const initial = (m.name?.[0] ?? '?').toUpperCase();

        return (
          <View
            key={m.id}
            style={[
              styles.avatar,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginLeft: i === 0 ? 0 : -overlap,
                borderWidth: border,
                zIndex: max - i,
              },
            ]}
          >
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
            />
            <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
          </View>
        );
      })}

      {remaining > 0 && (
        <View
          style={[
            styles.avatar,
            styles.remainder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -overlap,
              borderWidth: border,
            },
          ]}
        >
          <Text style={[styles.remainderText, { fontSize: size * 0.32 }]}>
            +{remaining}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderColor: '#0A1020',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  initial: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    letterSpacing: -0.4,
  },
  remainder: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: '#0A1020',
  },
  remainderText: {
    color: textTokens.primary,
    fontFamily: 'Inter_900Black',
  },
});

export default FamilyAvatarStack;
