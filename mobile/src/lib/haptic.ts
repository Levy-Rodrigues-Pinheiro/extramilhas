import * as Haptics from 'expo-haptics';

/**
 * Wrapper de haptic feedback. No-op em web.
 *
 * Uso:
 *   haptic.success(); // ação OK (salvou, aprovou, claim)
 *   haptic.warning(); // atenção (confirmação destrutiva)
 *   haptic.error();   // falha
 *   haptic.tap();     // tap leve em botões
 */
export const haptic = {
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warning() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  error() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
  tap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
};
