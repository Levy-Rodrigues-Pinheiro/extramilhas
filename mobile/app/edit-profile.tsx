import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMutation } from '@tanstack/react-query';
import api from '../src/lib/api';
import { useAuthStore } from '../src/store/auth.store';
import {
  AuroraBackground,
  AuroraButton,
  GlassCard,
  PressableScale,
  FloatingLabelInput,
  aurora,
  premium,
  semantic,
  surface,
  text as textTokens,
  space,
  gradients,
  motion,
  haptics,
} from '../src/components/primitives';

export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const updateName = useMutation({
    mutationFn: async (newName: string) => {
      const { data } = await api.put('/users/profile', { name: newName });
      return data;
    },
    onSuccess: (data: any) => {
      if (user) setUser({ ...user, name: data?.name ?? name });
      haptics.success();
      Alert.alert('Salvo!', 'Nome atualizado.');
    },
    onError: () => {
      haptics.error();
      Alert.alert('Erro', 'Não foi possível atualizar o nome.');
    },
  });

  const changePassword = useMutation({
    mutationFn: async (params: { currentPassword: string; newPassword: string }) => {
      const { data } = await api.put('/users/password', params);
      return data;
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      haptics.success();
      Alert.alert(
        'Senha trocada',
        'Você continua logado neste aparelho. Outros devices vão pedir login novo.',
      );
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Erro', err?.response?.data?.message || 'Falha ao trocar senha');
    },
  });

  const handleShareApp = async () => {
    haptics.tap();
    const refCode = (user as any)?.referralCode;
    const message = refCode
      ? `🛩️ Uso o Milhas Extras pra não perder bônus de transferência. Use meu código ${refCode} e a gente ganha 30d Premium cada: https://milhasextras.com.br/r/${refCode}`
      : '🛩️ Uso o Milhas Extras pra não perder bônus de transferência. Recomendo: https://milhasextras.com.br';
    try {
      await Share.share({ message });
    } catch {}
  };

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      haptics.error();
      Alert.alert('Atenção', 'Nome deve ter ao menos 2 caracteres');
      return;
    }
    if (trimmed === user?.name) return;
    updateName.mutate(trimmed);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      haptics.error();
      Alert.alert('Atenção', 'Preencha a senha atual e a nova');
      return;
    }
    if (newPassword.length < 6) {
      haptics.error();
      Alert.alert('Atenção', 'Nova senha precisa ter ao menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      haptics.error();
      Alert.alert('Atenção', 'As novas senhas não coincidem');
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <AuroraBackground intensity="subtle" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <PressableScale onPress={() => router.back()} haptic="tap" style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={textTokens.primary} />
            </PressableScale>
            <View style={styles.titleBox}>
              <Text style={styles.title}>Editar perfil</Text>
              <Text style={styles.subtitle}>Nome, senha, convite</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar */}
            <Animated.View
              entering={FadeInDown.duration(motion.timing.medium).springify().damping(22)}
              style={styles.avatarWrap}
            >
              <View style={styles.avatarHalo} />
              <LinearGradient
                colors={gradients.aurora}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            </Animated.View>

            {/* Nome */}
            <Animated.View entering={FadeInDown.delay(80).duration(motion.timing.medium)}>
              <Text style={styles.sectionLabel}>NOME</Text>
              <GlassCard radiusSize="lg" padding={14}>
                <FloatingLabelInput
                  label="Seu nome"
                  iconLeft="person-outline"
                  value={name}
                  onChangeText={setName}
                />
                <AuroraButton
                  label="Salvar nome"
                  onPress={handleSaveName}
                  loading={updateName.isPending}
                  disabled={!name.trim() || name.trim() === user?.name}
                  variant="apple"
                  size="md"
                  icon="checkmark"
                  fullWidth
                />
              </GlassCard>
            </Animated.View>

            {/* Senha */}
            <Animated.View
              entering={FadeInDown.delay(160).duration(motion.timing.medium)}
              style={{ marginTop: space.md }}
            >
              <Text style={styles.sectionLabel}>TROCAR SENHA</Text>
              <GlassCard radiusSize="lg" padding={14}>
                <FloatingLabelInput
                  label="Senha atual"
                  iconLeft="lock-closed-outline"
                  iconRight={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => {
                    haptics.select();
                    setShowCurrent(!showCurrent);
                  }}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                />
                <FloatingLabelInput
                  label="Nova senha (min 6)"
                  iconLeft="shield-checkmark-outline"
                  iconRight={showNew ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => {
                    haptics.select();
                    setShowNew(!showNew);
                  }}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <FloatingLabelInput
                  label="Confirmar nova senha"
                  iconLeft="checkmark-done-outline"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <AuroraButton
                  label="Trocar senha"
                  onPress={handleChangePassword}
                  loading={changePassword.isPending}
                  disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                  variant="primary"
                  size="md"
                  icon="key"
                  fullWidth
                />
              </GlassCard>
            </Animated.View>

            {/* Share app */}
            <Animated.View
              entering={FadeInDown.delay(240).duration(motion.timing.medium)}
              style={{ marginTop: space.md }}
            >
              <PressableScale onPress={handleShareApp} haptic="tap">
                <GlassCard radiusSize="lg" padding={14} glow="gold">
                  <View style={styles.shareRow}>
                    <View style={styles.shareIcon}>
                      <Ionicons name="gift" size={20} color={premium.goldLight} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shareTitle}>Convide amigos e ganhe</Text>
                      <Text style={styles.shareText}>
                        30 dias Premium grátis pra cada amigo que usar seu código.
                      </Text>
                    </View>
                    <Ionicons name="share-social" size={18} color={premium.goldLight} />
                  </View>
                </GlassCard>
              </PressableScale>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 8,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: surface.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: surface.glassBorder,
  },
  titleBox: {
    flex: 1,
    marginLeft: 4,
  },
  title: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: textTokens.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 1,
  },
  content: {
    padding: space.md,
    paddingBottom: 120,
  },
  sectionLabel: {
    color: textTokens.muted,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: space.md,
  },

  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: space.lg,
    position: 'relative',
  },
  avatarHalo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: aurora.magentaSoft,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: aurora.magenta,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarText: {
    color: '#FFF',
    fontFamily: 'Inter_900Black',
    fontSize: 32,
    letterSpacing: -0.8,
  },

  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: premium.goldSoft,
    borderWidth: 1,
    borderColor: `${premium.goldLight}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareTitle: {
    color: textTokens.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  shareText: {
    color: textTokens.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});
