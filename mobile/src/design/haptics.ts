/**
 * Haptic feedback helper — mapa semântico sobre expo-haptics.
 *
 * Regras:
 *  - `tap()` para toques primários
 *  - `select()` para mudanças de seleção (tabs, chips, segments)
 *  - `success()` / `warning()` / `error()` para estados finais
 *  - `heavy()` APENAS pra ações destrutivas (swipe-to-delete commit)
 *
 * Nunca dispara haptic em scroll, ambient animations ou first render.
 * Se Haptics não disponível (web), no-op silencioso.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Toque em botão primário / card principal */
export const tap = () => {
  if (!isSupported) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** Mudança de seleção (tab, chip, segmented control) */
export const select = () => {
  if (!isSupported) return;
  Haptics.selectionAsync().catch(() => {});
};

/** Long-press ativado, pull-to-refresh triggered */
export const medium = () => {
  if (!isSupported) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

/** Ação destrutiva committed, sheet dismiss via drag */
export const heavy = () => {
  if (!isSupported) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
};

/** Success — reward, goal hit, transação executada com sucesso */
export const success = () => {
  if (!isSupported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/** Warning — ação que precisa atenção (expiring soon, risk) */
export const warning = () => {
  if (!isSupported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};

/** Error — validação falhou, ação rejeitada */
export const error = () => {
  if (!isSupported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
};

/** Threshold crossed (ex: ROI > target, streak hit, wallet += X) */
export const threshold = tap;

export const haptics = {
  tap,
  select,
  medium,
  heavy,
  success,
  warning,
  error,
  threshold,
} as const;

export default haptics;
