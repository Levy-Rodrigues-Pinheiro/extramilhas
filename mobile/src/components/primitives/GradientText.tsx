/**
 * GradientText — Aurora UI signature .gradient-text em React Native.
 *
 * Aurora UI CSS:
 *   .gradient-text {
 *     background: linear-gradient(135deg, var(--accent), var(--accent-2), var(--accent-3));
 *     -webkit-background-clip: text; color: transparent;
 *   }
 *   = #0a84ff → #bf5af2 → #ff375f
 *
 * RN não tem background-clip:text. Como não temos @react-native-masked-view
 * instalado, usamos um fallback "multi-layer" que aproxima o feel:
 *
 *   - Layer 1: texto renderizado em cyan (stop inicial)
 *   - Layer 2 (absolute, opacity progressiva): texto em iris (stop meio)
 *   - Layer 3 (absolute, opacity progressiva): texto em magenta (stop final)
 *
 * Para um typesetting curto (hero display, 1-3 palavras) o olho lê como gradient
 * diagonal. Para texto longo, degrada pra cor iris sólida (meio do stop).
 *
 * Uso:
 *   <GradientText fontSize={56} fontWeight="700">Milhas</GradientText>
 *   <GradientText colors={[premium.goldLight, premium.gold]}>Premium</GradientText>
 *   <GradientText italic>infinitas</GradientText>
 */

import React from 'react';
import {
  Text,
  TextProps,
  TextStyle,
  View,
  StyleSheet,
} from 'react-native';
import { aurora } from '../../design/tokens';

type GradientTextProps = Omit<TextProps, 'style'> & {
  children: React.ReactNode;
  /** Hex colors — default Aurora signature (cyan→iris→magenta) */
  colors?: string[];
  /** Aplica fontStyle italic (pareia com serif-italic) */
  italic?: boolean;
  /** Text style override */
  style?: TextStyle | TextStyle[];
  /** Variant: 'solid' usa só cor do meio (texto longo); 'layered' faz efeito diagonal (headings). Default: layered. */
  variant?: 'layered' | 'solid';
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  fontFamily?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: TextStyle['textAlign'];
};

const DEFAULT_COLORS = [aurora.cyan, aurora.iris, aurora.magenta];

export function GradientText({
  children,
  colors,
  italic,
  style,
  variant = 'layered',
  fontSize,
  fontWeight,
  fontFamily,
  letterSpacing,
  lineHeight,
  textAlign,
  ...rest
}: GradientTextProps) {
  const gradColors = colors && colors.length >= 2 ? colors : DEFAULT_COLORS;

  const baseStyle: TextStyle = {
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacing,
    lineHeight,
    textAlign,
    fontStyle: italic ? 'italic' : 'normal',
  };

  // Texto longo / solid → cor do meio do gradient pra legibilidade máxima
  if (variant === 'solid') {
    const middle = gradColors[Math.floor(gradColors.length / 2)];
    return (
      <Text style={[baseStyle, { color: middle }, style as any]} {...rest}>
        {children}
      </Text>
    );
  }

  // variant='layered' — 3 camadas sobrepostas com maskOverlay simulado via opacity
  // A primeira (base) usa o stop inicial 100%.
  // As próximas overlays somam gradualmente com opacity em mask linear.
  // Esse aproximação funciona pra headings curtos (hero displays).
  return (
    <View style={styles.wrap}>
      <Text style={[baseStyle, { color: gradColors[0] }, style as any]} {...rest}>
        {children}
      </Text>
      {gradColors.slice(1).map((color, i) => {
        // opacity decresce: 1 stop → 0.66, 2 stop → 0.5 (simula gradient diagonal)
        const opacity = 1 / (i + 2);
        return (
          <Text
            key={i}
            style={[
              baseStyle,
              styles.overlay,
              { color, opacity },
              style as any,
            ]}
            {...rest}
            accessible={false}
            importantForAccessibility="no"
          >
            {children}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    flexDirection: 'row',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default GradientText;
