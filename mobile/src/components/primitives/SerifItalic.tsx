/**
 * SerifItalic — Aurora UI .serif-italic editorial accent.
 *
 * Aurora UI CSS:
 *   .serif-italic {
 *     font-family: var(--font-serif); // "New York", Georgia, serif
 *     font-style: italic;
 *     font-weight: 400;
 *   }
 *
 * É o "truque" editorial do site Aurora: em meio a tipografia display
 * sans-serif condensada (tipo "A nova forma de"), surge uma palavra-
 * chave em serif italic ("evoluir"). Dá personalidade, não-genérica.
 *
 * RN: Georgia já disponível nativamente em iOS e Android (via fallback).
 * iOS: 'Georgia-Italic' / 'Georgia-BoldItalic'
 * Android: 'serif' + fontStyle italic (fallback system)
 *
 * Uso:
 *   <Text>A forma de <SerifItalic>evoluir</SerifItalic> suas milhas.</Text>
 *   <SerifItalic fontSize={40}>futuro</SerifItalic>
 */

import React from 'react';
import { Text, TextProps, TextStyle, Platform } from 'react-native';
import { text as textTokens } from '../../design/tokens';

type SerifItalicProps = Omit<TextProps, 'style'> & {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  color?: string;
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  lineHeight?: number;
  letterSpacing?: number;
};

const SERIF_ITALIC_FAMILY = Platform.select({
  ios: 'Georgia-Italic',
  android: 'serif',
  default: 'Georgia',
}) as string;

export function SerifItalic({
  children,
  style,
  color,
  fontSize,
  fontWeight = '400',
  lineHeight,
  letterSpacing,
  ...rest
}: SerifItalicProps) {
  return (
    <Text
      style={[
        {
          fontFamily: SERIF_ITALIC_FAMILY,
          fontStyle: 'italic',
          fontWeight,
          color: color ?? textTokens.primary,
          fontSize,
          lineHeight,
          letterSpacing,
        },
        style as any,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export default SerifItalic;
