/**
 * Sparkline — mini-chart linha estilo Apple Stocks/Health.
 *
 * Características Apple:
 *  - Sem axis labels, sem grid (só a linha)
 *  - Stroke 2-2.5 com cor semântica (verde positivo / vermelho negativo / accent neutro)
 *  - Area gradient embaixo da linha (fade 0.3 → 0)
 *  - Anima ao mount: stroke "desenha" da esquerda pra direita (1s)
 *  - Variant compact (apenas linha, 40-60h) e detail (com area gradient)
 *
 * Uso:
 *   <Sparkline data={[100, 110, 105, 120, 130, 140, 138]} positive />
 *   <Sparkline data={...} variant="line" height={30} />
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { aurora, semantic } from '../../design/tokens';
import { useReduceMotion } from '../../design/hooks';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Variant = 'line' | 'area';

type Props = {
  /** Array de valores (qualquer escala — normaliza internamente) */
  data: number[];
  /** Largura do sparkline (default 120) */
  width?: number;
  /** Altura (default 40) */
  height?: number;
  /** Cor da linha (default aurora.cyan) */
  color?: string;
  /** Stroke width (default 2.2) */
  strokeWidth?: number;
  /** True → cor verde semantic.success; false → semantic.danger; null → usa color */
  positive?: boolean | null;
  /** Variant: line (apenas) ou area (com gradient embaixo) */
  variant?: Variant;
  /** Delay inicial da animação ms */
  delay?: number;
};

export function Sparkline({
  data,
  width = 120,
  height = 40,
  color,
  strokeWidth = 2.2,
  positive = null,
  variant = 'area',
  delay = 0,
}: Props) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 1100,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
    );
  }, [progress, delay, reduceMotion]);

  // Determina cor final
  const lineColor =
    color ??
    (positive === true
      ? semantic.success
      : positive === false
        ? semantic.danger
        : aurora.cyan);

  // Empty state
  if (!data || data.length < 2) {
    return <View style={{ width, height }} />;
  }

  // Normaliza pontos pra coordenadas SVG
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = strokeWidth / 2 + 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const yNorm = (v - min) / range;
    // Inverter Y porque SVG cresce pra baixo
    const y = height - padding - yNorm * (height - padding * 2);
    return { x, y };
  });

  // Path "linha"
  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  // Path "area" — fecha embaixo
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${height - padding}` +
    ` L ${points[0].x} ${height - padding} Z`;

  // Calcula comprimento aproximado pra animação stroke-dashoffset
  // (não precisa ser exato — só pra strokeDasharray funcionar)
  const approxLength = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
  }, 0);

  const animatedLineProps = useAnimatedProps(() => ({
    strokeDasharray: [approxLength, approxLength] as any,
    strokeDashoffset: approxLength * (1 - progress.value),
  }));

  const animatedAreaProps = useAnimatedProps(() => ({
    opacity: progress.value,
  }));

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgLinearGradient id={`sparkArea-${lineColor}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lineColor} stopOpacity={0.32} />
          <Stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>

      {variant === 'area' && (
        <AnimatedPath
          d={areaPath}
          fill={`url(#sparkArea-${lineColor})`}
          animatedProps={animatedAreaProps}
        />
      )}

      <AnimatedPath
        d={linePath}
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animatedProps={animatedLineProps}
      />
    </Svg>
  );
}

export default Sparkline;
