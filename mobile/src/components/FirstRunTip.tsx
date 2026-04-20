import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Tip card que aparece 1x por chave (ex: first-time-arbitrage). User dismiss
 * → grava no AsyncStorage → nunca mais aparece. Zero intrusão.
 *
 * Uso:
 *   <FirstRunTip
 *     tipKey="arbitrage-intro"
 *     title="Primeira vez aqui?"
 *     body="Cada card mostra um bônus ativo. Quanto maior o ganho %, mais vale."
 *   />
 */
export function FirstRunTip({
  tipKey,
  title,
  body,
  icon = 'bulb',
}: {
  tipKey: string;
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(`tip:${tipKey}`)
      .then((v) => setDismissed(v === '1'))
      .catch(() => setDismissed(true));
  }, [tipKey]);

  const handleDismiss = async () => {
    setDismissed(true);
    try {
      await AsyncStorage.setItem(`tip:${tipKey}`, '1');
    } catch {}
  };

  if (dismissed !== false) return null;

  return (
    <LinearGradient
      colors={['#1E1B4B', '#1E293B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.box}
    >
      <View style={styles.icon}>
        <Ionicons name={icon} size={18} color="#A78BFA" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <TouchableOpacity onPress={handleDismiss} style={styles.close} hitSlop={10}>
        <Ionicons name="close" size={18} color="#64748B" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B2F66',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B2F66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#F1F5F9', fontSize: 13, fontWeight: '700' },
  body: { color: '#CBD5E1', fontSize: 12, lineHeight: 17, marginTop: 3 },
  close: { padding: 4 },
});
