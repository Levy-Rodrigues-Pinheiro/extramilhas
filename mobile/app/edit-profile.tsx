import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import api from '../src/lib/api';
import { useAuthStore } from '../src/store/auth.store';

/**
 * Edit profile: troca nome + troca senha (com validação atual).
 * Também tem botão "Compartilhar app" pro user espalhar organicamente.
 */
export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const updateName = useMutation({
    mutationFn: async (newName: string) => {
      const { data } = await api.put('/users/profile', { name: newName });
      return data;
    },
    onSuccess: (data: any) => {
      if (user) setUser({ ...user, name: data?.name ?? name });
      Alert.alert('Salvo!', 'Nome atualizado.');
    },
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar o nome.'),
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
      Alert.alert('Senha trocada', 'Você continua logado neste aparelho. Outros devices vão pedir login novo.');
    },
    onError: (err: any) => {
      Alert.alert('Erro', err?.response?.data?.message || 'Falha ao trocar senha');
    },
  });

  const handleShareApp = async () => {
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
      Alert.alert('Atenção', 'Nome deve ter ao menos 2 caracteres');
      return;
    }
    if (trimmed === user?.name) return;
    updateName.mutate(trimmed);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Atenção', 'Preencha a senha atual e a nova');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Atenção', 'Nova senha precisa ter ao menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Atenção', 'As novas senhas não coincidem');
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleBox}>
            <Text style={styles.title}>Editar perfil</Text>
            <Text style={styles.subtitle}>Nome, senha, convite</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Nome */}
          <Text style={styles.section}>Nome</Text>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor="#475569"
              autoCapitalize="words"
            />
            <TouchableOpacity
              onPress={handleSaveName}
              disabled={updateName.isPending || name.trim() === user?.name}
              style={[styles.btn, styles.btnPrimary, (updateName.isPending || name.trim() === user?.name) && { opacity: 0.5 }]}
            >
              {updateName.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* E-mail read-only */}
          <Text style={styles.section}>E-mail</Text>
          <View style={[styles.input, styles.inputRO]}>
            <Text style={{ color: '#64748B' }}>{user?.email}</Text>
          </View>
          <Text style={styles.hint}>E-mail não pode ser alterado — crie nova conta se precisar.</Text>

          {/* Trocar senha */}
          <Text style={styles.section}>Trocar senha</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Senha atual"
            placeholderTextColor="#475569"
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nova senha (mín 6 caracteres)"
            placeholderTextColor="#475569"
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirme a nova senha"
            placeholderTextColor="#475569"
            secureTextEntry
          />
          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={changePassword.isPending || !currentPassword || !newPassword}
            style={[styles.btn, styles.btnPrimary, { marginTop: 8 }, (changePassword.isPending || !currentPassword || !newPassword) && { opacity: 0.5 }]}
          >
            {changePassword.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnPrimaryText}>Trocar senha</Text>
            )}
          </TouchableOpacity>

          {/* Share app */}
          <View style={styles.shareBox}>
            <LinearGradient
              colors={['#25D366', '#128C7E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shareGradient}
            >
              <Ionicons name="gift" size={20} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.shareTitle}>Convide amigos, ganhe Premium</Text>
                <Text style={styles.shareSub}>
                  30d grátis pra cada amigo que se cadastrar com seu código
                </Text>
              </View>
              <TouchableOpacity onPress={handleShareApp} style={styles.shareBtn}>
                <Text style={styles.shareBtnText}>Compartilhar</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 8, width: 40 },
  titleBox: { flex: 1 },
  title: { color: '#fff', fontSize: 19, fontWeight: '700' },
  subtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  content: { padding: 16, paddingBottom: 60 },

  section: {
    color: '#94A3B8', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 20, marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    borderRadius: 8, padding: 12,
    color: '#F1F5F9', fontSize: 14,
    marginBottom: 8, flex: 1,
  },
  inputRO: { paddingVertical: 14 },
  hint: { color: '#64748B', fontSize: 11, marginTop: 2, marginBottom: 10 },

  btn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#8B5CF6' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  shareBox: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
  shareGradient: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  shareTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  shareSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  shareBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shareBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
