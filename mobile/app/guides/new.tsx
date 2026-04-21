import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useCreateGuide, useSubmitGuide } from '../../src/hooks/useGuides';
import { Colors, Gradients } from '../../src/lib/theme';

export default function NewGuideScreen() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const create = useCreateGuide();
  const submit = useSubmitGuide();

  const handleSaveAndSubmit = async () => {
    if (title.length < 5 || summary.length < 10 || body.length < 100) {
      Alert.alert('Dados inválidos', 'Título min 5, resumo min 10, corpo min 100 chars.');
      return;
    }
    try {
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const draft = await create.mutateAsync({ title, summary, body, tags });
      await submit.mutateAsync(draft.id);
      Alert.alert(
        '✓ Enviado pra revisão',
        'Seu guia foi submetido. Admin analisa em até 48h e você recebe notificação quando publicar.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('errors.generic'));
    }
  };

  const loading = create.isPending || submit.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Novo guia</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Compartilhe o que você aprendeu sobre milhas. Após submissão, admin revisa em até 48h
            e publica pra toda a comunidade.
          </Text>

          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="ex: Como fui pra Paris com 60k milhas Smiles"
            placeholderTextColor={Colors.text.muted}
            maxLength={200}
            accessibilityLabel="Título do guia"
          />

          <Text style={styles.label}>Resumo (até 280 chars)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={summary}
            onChangeText={setSummary}
            placeholder="Parágrafo curto que aparece na listagem..."
            placeholderTextColor={Colors.text.muted}
            multiline
            maxLength={280}
            accessibilityLabel="Resumo"
          />
          <Text style={styles.charCount}>{summary.length}/280</Text>

          <Text style={styles.label}>Conteúdo (Markdown OK)</Text>
          <TextInput
            style={[styles.input, styles.inputBody]}
            value={body}
            onChangeText={setBody}
            placeholder="Detalhe passo a passo o que você fez, com números reais..."
            placeholderTextColor={Colors.text.muted}
            multiline
            maxLength={50000}
            accessibilityLabel="Corpo do guia"
          />
          <Text style={styles.charCount}>{body.length}/50000</Text>

          <Text style={styles.label}>Tags (separe por vírgula)</Text>
          <TextInput
            style={styles.input}
            value={tagsRaw}
            onChangeText={setTagsRaw}
            placeholder="ex: smiles, paris, europa"
            placeholderTextColor={Colors.text.muted}
            accessibilityLabel="Tags"
          />

          <TouchableOpacity
            onPress={handleSaveAndSubmit}
            disabled={loading}
            style={styles.submit}
            accessibilityRole="button"
            accessibilityLabel="Enviar pra revisão"
          >
            <LinearGradient
              colors={Gradients.primary as unknown as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                  <Text style={styles.submitText}>Enviar pra revisão</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bg.card,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 13, color: Colors.text.secondary, lineHeight: 18, marginBottom: 20 },
  label: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  inputBody: { minHeight: 240, textAlignVertical: 'top' },
  charCount: { fontSize: 10, color: Colors.text.muted, textAlign: 'right', marginTop: 4 },
  submit: { marginTop: 20 },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
