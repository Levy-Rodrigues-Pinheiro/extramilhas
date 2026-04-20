import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * OfflineBanner simples. Sem dependência de NetInfo — usa fetch self-test.
 * Ping GET /health a cada 30s; se falha 2x consecutivas, mostra banner.
 * Intrusão zero — summem ao reconectar.
 */
const HEALTH = `${process.env.EXPO_PUBLIC_API_URL || 'https://milhasextras-api.fly.dev/api/v1'}/health`;

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let fails = 0;
    let active = true;
    const check = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(HEALTH, { signal: ctrl.signal });
        clearTimeout(t);
        if (!active) return;
        if (res.ok) {
          fails = 0;
          setOffline(false);
        } else {
          fails++;
          if (fails >= 2) setOffline(true);
        }
      } catch {
        if (!active) return;
        fails++;
        if (fails >= 2) setOffline(true);
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!offline) return null;

  return (
    <View style={styles.box}>
      <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
      <Text style={styles.text}>Sem conexão — dados podem estar desatualizados</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 24,
    left: 8,
    right: 8,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 4,
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },
});
