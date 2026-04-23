/**
 * SettingsRow + SettingsGroup — iOS grouped list Apple-native.
 *
 * Padrão exato do iOS Settings:
 *  - Group: rounded container com divisores internos entre rows
 *  - Row: icon colored tile + label + (value/toggle/chevron)
 *  - Haptic select em toggle, haptic tap em navigation
 *  - Separator interno não vai até a borda (margin-left = icon width)
 *  - Header/footer opcionais em all-caps 11pt letter-spacing
 *
 * Uso:
 *   <SettingsGroup header="CONTA" footer="Sua conta é sincronizada entre dispositivos.">
 *     <SettingsRow icon="person" label="Editar perfil" onPress={...} />
 *     <SettingsRow icon="notifications" label="Notificações" trailing="Ativas" onPress={...} />
 *     <SettingsRow icon="moon" label="Modo escuro" toggle={dark} onToggle={setDark} />
 *     <SettingsRow icon="trash" label="Excluir conta" destructive onPress={...} />
 *   </SettingsGroup>
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from './PressableScale';
import {
  aurora,
  premium,
  semantic,
  surface,
  text as textTokens,
  space,
  bg as bgTokens,
} from '../../design/tokens';
import { haptics } from '../../design/haptics';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── SettingsGroup ──────────────────────────────────────────────────────

type GroupProps = {
  header?: string;
  footer?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SettingsGroup({ header, footer, children, style }: GroupProps) {
  // Count valid children pra inserir divisores corretos
  const rows = React.Children.toArray(children).filter((c) => React.isValidElement(c));

  return (
    <View style={[groupStyles.wrap, style]}>
      {header && <Text style={groupStyles.header}>{header}</Text>}

      <View style={groupStyles.container}>
        {rows.map((row, i) => (
          <View key={i}>
            {row}
            {i < rows.length - 1 && <View style={groupStyles.divider} />}
          </View>
        ))}
      </View>

      {footer && <Text style={groupStyles.footer}>{footer}</Text>}
    </View>
  );
}

// ─── SettingsRow ────────────────────────────────────────────────────────

type RowProps = {
  icon?: IconName;
  iconColor?: string;
  iconBg?: string;
  label: string;
  /** Valor à direita (ex: "Ativado", "Português") */
  trailing?: string;
  /** Switch ao invés de chevron — se definido, row vira toggle */
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  /** onPress (se for navigation row) */
  onPress?: () => void;
  /** Vermelho pra ações destrutivas */
  destructive?: boolean;
  /** Badge count no trailing */
  badge?: number | string;
  /** Disabled state */
  disabled?: boolean;
  /** Show chevron (default true se tem onPress) */
  showChevron?: boolean;
  /** Custom render pro trailing */
  trailingCustom?: React.ReactNode;
};

export function SettingsRow({
  icon,
  iconColor,
  iconBg,
  label,
  trailing,
  toggle,
  onToggle,
  onPress,
  destructive,
  badge,
  disabled,
  showChevron,
  trailingCustom,
}: RowProps) {
  const labelColor = destructive
    ? semantic.danger
    : disabled
    ? textTokens.muted
    : textTokens.primary;
  const resolvedIconColor = iconColor ?? (destructive ? semantic.danger : aurora.cyan);
  const resolvedIconBg =
    iconBg ?? (destructive ? semantic.dangerBg : aurora.cyanSoft);

  const isToggle = toggle !== undefined;
  const shouldShowChevron =
    showChevron ?? (!isToggle && !!onPress && !trailingCustom);

  // Toggle row vs navigation row
  const content = (
    <View style={rowStyles.content}>
      {icon && (
        <View
          style={[
            rowStyles.iconTile,
            { backgroundColor: resolvedIconBg, borderColor: `${resolvedIconColor}55` },
          ]}
        >
          <Ionicons name={icon} size={16} color={resolvedIconColor} />
        </View>
      )}
      <Text style={[rowStyles.label, { color: labelColor }]}>{label}</Text>

      {/* Trailing content */}
      {trailingCustom ? (
        trailingCustom
      ) : isToggle ? (
        <Switch
          value={!!toggle}
          onValueChange={(v) => {
            haptics.select();
            onToggle?.(v);
          }}
          trackColor={{ false: surface.glass, true: aurora.cyan }}
          thumbColor={toggle ? '#FFF' : textTokens.muted}
          ios_backgroundColor={surface.glass}
          disabled={disabled}
        />
      ) : badge != null ? (
        <View style={rowStyles.badge}>
          <Text style={rowStyles.badgeText}>
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : trailing ? (
        <Text style={rowStyles.trailing}>{trailing}</Text>
      ) : null}

      {shouldShowChevron && (
        <Ionicons
          name="chevron-forward"
          size={15}
          color={textTokens.dim}
          style={{ marginLeft: 4 }}
        />
      )}
    </View>
  );

  if (isToggle || !onPress) {
    return <View style={rowStyles.wrap}>{content}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      pressedScale={0.99}
      disabled={disabled}
      style={rowStyles.wrap}
    >
      {content}
    </PressableScale>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const groupStyles = StyleSheet.create({
  wrap: {
    marginBottom: space.xl,
  },
  header: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: space.md,
  },
  container: {
    borderRadius: 14,
    backgroundColor: surface.glass,
    borderWidth: 1,
    borderColor: surface.glassBorder,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54, // = icon width 32 + margin 12 + padding
    backgroundColor: surface.separator,
  },
  footer: {
    color: textTokens.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: space.md,
  },
});

const rowStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    minHeight: 50,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    letterSpacing: -0.1,
  },
  trailing: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  badge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: aurora.magenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 0.1,
  },
});

export default SettingsRow;
