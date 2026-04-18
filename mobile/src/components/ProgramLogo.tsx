import React, { useState } from 'react';
import { Text, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getProgramGradient, getProgramColor } from '../lib/theme';

const PROGRAM_INITIALS: Record<string, string> = {
  smiles: 'SM',
  livelo: 'LV',
  tudoazul: 'TA',
  latampass: 'LP',
  esfera: 'ES',
  multiplus: 'MP',
};

// Logo URLs using Clearbit Logo API (reliable CDN)
const PROGRAM_LOGOS: Record<string, string> = {
  smiles: 'https://logo.clearbit.com/smiles.com.br',
  livelo: 'https://logo.clearbit.com/livelo.com.br',
  tudoazul: 'https://logo.clearbit.com/voeazul.com.br',
  latampass: 'https://logo.clearbit.com/latamairlines.com',
  esfera: 'https://logo.clearbit.com/esfera.com.vc',
};

interface ProgramLogoProps {
  slug: string;
  size?: number;
  logoUrl?: string;
}

export function ProgramLogo({ slug, size = 40, logoUrl }: ProgramLogoProps) {
  const key = slug.toLowerCase();
  const gradient = getProgramGradient(key);
  const programColor = getProgramColor(key);
  const initials = PROGRAM_INITIALS[key] ?? slug.slice(0, 2).toUpperCase();
  const fontSize = size * 0.36;
  const [imageError, setImageError] = useState(false);

  const imgUrl = logoUrl || PROGRAM_LOGOS[key];
  const showImage = !!imgUrl && !imageError;

  return (
    <LinearGradient
      colors={[gradient[0], gradient[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: programColor,
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 4,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: imgUrl }}
          style={{
            width: size * 0.65,
            height: size * 0.65,
            borderRadius: size * 0.1,
          }}
          resizeMode="contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <Text style={[styles.text, { fontSize }]}>{initials}</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
  },
  text: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
