import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  name,
  focused,
  color,
}: {
  name: IoniconName;
  focused: boolean;
  color: string;
}) {
  return <Ionicons name={focused ? name : (`${name}-outline` as IoniconName)} size={22} color={color} />;
}

/**
 * Tab bar focada 100% em milhas.
 *
 * Início (arbitragem) | Carteira | Calculadora | Alertas | Perfil
 *
 * Telas legacy (simulator, compare) ainda existem em arquivo mas estão
 * ocultadas via `href: null` — podem voltar quando/se fizer sentido. Hoje
 * o foco é monetização via arbitragem.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: `${Colors.bg.card}E6`,
          borderTopWidth: 0,
          position: 'absolute',
          bottom: Platform.OS === 'web' ? 12 : 16,
          left: 16,
          right: 16,
          borderRadius: 20,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarActiveTintColor: Colors.primary.light,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Carteira',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="wallet" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: 'Calc',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="calculator" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="notifications" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="person" focused={focused} color={color} />
          ),
        }}
      />

      {/* OCULTAS — telas mantidas em arquivo mas removidas do tab bar */}
      <Tabs.Screen name="simulator" options={{ href: null }} />
      <Tabs.Screen name="compare" options={{ href: null }} />
    </Tabs>
  );
}
