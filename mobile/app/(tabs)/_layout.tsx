import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FloatingTabBar } from '../../src/components/primitives/FloatingTabBar';
import { useNotificationFeed } from '../../src/hooks/useNotificationFeed';

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
 * Tab bar focada 100% em milhas — v2 com design system Aurora.
 *
 * Início (arbitragem) | Carteira | Calculadora | Alertas | Perfil
 *
 * Usa `FloatingTabBar` custom (design system) ao invés do padrão expo-router:
 *  - Indicator desliza entre tabs via spring
 *  - Ícone bounces no focus
 *  - Badge com pop animation
 *  - Glass surface + aurora gradient no indicator
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const notifFeed = useNotificationFeed();
  const unreadCount = notifFeed.data?.unreadCount ?? 0;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.greeting').replace('👋', '').trim() || 'Início',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
          tabBarAccessibilityLabel: 'Início',
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t('wallet.title'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="wallet" focused={focused} color={color} />
          ),
          tabBarAccessibilityLabel: t('wallet.title'),
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: t('home.quick_calc'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="calculator" focused={focused} color={color} />
          ),
          tabBarAccessibilityLabel: t('home.quick_calc'),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: t('home.quick_alerts'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="notifications" focused={focused} color={color} />
          ),
          tabBarAccessibilityLabel: t('alerts_screen.title'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="person" focused={focused} color={color} />
          ),
          tabBarAccessibilityLabel: unreadCount > 0
            ? `${t('profile.title')}, ${unreadCount} notificações não lidas`
            : t('profile.title'),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined,
        }}
      />

      {/* OCULTAS — telas legacy mantidas em arquivo mas removidas do tab bar */}
      <Tabs.Screen name="simulator" options={{ href: null }} />
      <Tabs.Screen name="compare" options={{ href: null }} />
    </Tabs>
  );
}
