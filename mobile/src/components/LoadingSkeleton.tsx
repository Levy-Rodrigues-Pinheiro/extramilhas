import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonBoxProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

function SkeletonBox({ width, height, borderRadius = 8, style }: SkeletonBoxProps) {
  const opacity = new Animated.Value(0.3);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: '#253349',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function OfferCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <SkeletonBox width={40} height={40} borderRadius={20} />
        <View style={styles.headerText}>
          <SkeletonBox width={100} height={14} />
          <SkeletonBox width={60} height={11} style={{ marginTop: 4 }} />
        </View>
        <SkeletonBox width={50} height={22} borderRadius={11} />
      </View>
      <SkeletonBox width="100%" height={16} style={{ marginTop: 12 }} />
      <SkeletonBox width="70%" height={14} style={{ marginTop: 6 }} />
      <View style={styles.footer}>
        <SkeletonBox width={80} height={28} borderRadius={8} />
        <SkeletonBox width={100} height={36} borderRadius={10} />
      </View>
    </View>
  );
}

export function OfferListSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <OfferCardSkeleton key={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141C2F',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#253349',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
});
