import React from 'react';
import { TouchableOpacity, ViewStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * IconButton com ARIA label mandatório + tap target mínimo 44x44 (iOS WCAG).
 * Evita a armadilha de botões só-ícone sem texto alternativo que quebram
 * VoiceOver/TalkBack.
 */
export function AccessibleIconButton({
  icon,
  label,
  onPress,
  size = 22,
  color = '#fff',
  bg = 'transparent',
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string; // descreve a AÇÃO, não o ícone. Ex: "Voltar" não "seta"
  onPress: () => void;
  size?: number;
  color?: string;
  bg?: string;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      style={[
        {
          minWidth: 44,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderRadius: 22,
        },
        style,
      ]}
    >
      <View>
        <Ionicons name={icon} size={size} color={color} />
      </View>
    </TouchableOpacity>
  );
}
