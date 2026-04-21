import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, Gradients } from '../src/lib/theme';

/**
 * Claims wizard — template de carta pra recorrer de milhas não creditadas.
 *
 * Cobertura:
 *   - Milhas não creditadas após voo realizado
 *   - Bônus prometido não aplicado em transferência
 *   - Pontos retirados sem justificativa
 *
 * Gera um texto pronto pro user copiar e enviar por SAC/e-mail do programa.
 * Inclui campos LGPD (dados pessoais não saem do device).
 */
type ClaimType = 'voo' | 'bonus' | 'retirada';

const CLAIM_TEMPLATES: Record<
  ClaimType,
  { title: string; body: (data: Record<string, string>) => string; fields: Array<{ key: string; label: string; placeholder?: string }> }
> = {
  voo: {
    title: 'Milhas de voo não creditadas',
    fields: [
      { key: 'programa', label: 'Programa', placeholder: 'Ex: Smiles' },
      { key: 'cpf', label: 'CPF (será enviado ao programa)', placeholder: '000.000.000-00' },
      { key: 'cia', label: 'Companhia aérea', placeholder: 'GOL' },
      { key: 'voo', label: 'Nº do voo', placeholder: 'G3 1234' },
      { key: 'data', label: 'Data do voo', placeholder: '2026-03-15' },
      { key: 'origem', label: 'Origem/Destino', placeholder: 'GRU-BSB' },
      { key: 'milhas', label: 'Milhas esperadas', placeholder: '2500' },
    ],
    body: (d) => `Prezados ${d.programa || '[Programa]'},

Venho por meio desta solicitar a creditação de milhas referentes ao voo realizado abaixo, que não foram computadas na minha conta até a presente data.

DADOS DO VOO:
• Companhia: ${d.cia || '[companhia]'}
• Voo: ${d.voo || '[número do voo]'}
• Data: ${d.data || '[data]'}
• Trecho: ${d.origem || '[origem-destino]'}
• Milhas esperadas: ${d.milhas || '[qtd]'}

TITULAR:
• CPF: ${d.cpf || '[CPF]'}

Anexo comprovante de embarque e bilhete eletrônico. Solicito o crédito das milhas na minha conta no prazo regulamentar.

Atenciosamente.`,
  },
  bonus: {
    title: 'Bônus de transferência não aplicado',
    fields: [
      { key: 'programa', label: 'Programa destino', placeholder: 'Ex: Smiles' },
      { key: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
      { key: 'origem', label: 'Programa origem', placeholder: 'Livelo' },
      { key: 'pontos', label: 'Pontos transferidos', placeholder: '30000' },
      { key: 'bonusPct', label: 'Bônus divulgado (%)', placeholder: '100' },
      { key: 'data', label: 'Data da transferência', placeholder: '2026-04-10' },
    ],
    body: (d) => `Prezados ${d.programa || '[Programa]'},

Em ${d.data || '[data]'} realizei transferência de ${d.pontos || '[qtd]'} pontos ${d.origem || '[origem]'} para ${d.programa || '[destino]'} durante campanha promocional de ${d.bonusPct || '[X]'}% de bônus.

No entanto, ao verificar meu saldo, o bônus prometido não foi aplicado. Solicito a regularização conforme campanha divulgada.

CPF: ${d.cpf || '[CPF]'}

Anexo print da promoção no momento da transferência e comprovante do programa de origem.

Atenciosamente.`,
  },
  retirada: {
    title: 'Retirada/estorno injustificado',
    fields: [
      { key: 'programa', label: 'Programa', placeholder: 'Ex: Latam Pass' },
      { key: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
      { key: 'milhas', label: 'Milhas retiradas', placeholder: '20000' },
      { key: 'data', label: 'Data da retirada', placeholder: '2026-04-15' },
    ],
    body: (d) => `Prezados ${d.programa || '[Programa]'},

Identifiquei em ${d.data || '[data]'} retirada/estorno de ${d.milhas || '[qtd]'} milhas da minha conta sem comunicação prévia ou justificativa formal.

Solicito esclarecimentos e, se injustificado, restituição das milhas.

CPF: ${d.cpf || '[CPF]'}

Aguardo retorno em até 5 dias úteis conforme CDC. Caso não haja resposta, formalizarei reclamação no Procon.

Atenciosamente.`,
  },
};

export default function ClaimsWizardScreen() {
  const { t } = useTranslation();
  const [type, setType] = useState<ClaimType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const template = type ? CLAIM_TEMPLATES[type] : null;

  const generatedText = template ? template.body(formData) : '';

  const handleShare = async () => {
    if (!generatedText) return;
    try {
      await Share.share({ message: generatedText });
    } catch {
      /* cancelou */
    }
  };

  const reset = () => {
    setType(null);
    setFormData({});
  };

  if (!type) {
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
          <Text style={styles.title}>Recuperar milhas</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Qual é o problema? Gero uma carta modelo pronta pra você enviar ao SAC do programa.
          </Text>
          {(Object.keys(CLAIM_TEMPLATES) as ClaimType[]).map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => setType(k)}
              style={styles.optionCard}
              accessibilityRole="button"
              accessibilityLabel={CLAIM_TEMPLATES[k].title}
            >
              <View style={styles.optionIcon}>
                <Ionicons
                  name={k === 'voo' ? 'airplane' : k === 'bonus' ? 'gift' : 'remove-circle'}
                  size={22}
                  color={Colors.primary.light}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{CLAIM_TEMPLATES[k].title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.text.muted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={reset}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {template!.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Preencha os dados. O texto é gerado abaixo — revise e compartilhe.</Text>

        {template!.fields.map((f) => (
          <View key={f.key} style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <TextInput
              style={styles.input}
              value={formData[f.key] || ''}
              onChangeText={(v) => setFormData((p) => ({ ...p, [f.key]: v }))}
              placeholder={f.placeholder}
              placeholderTextColor={Colors.text.muted}
              accessibilityLabel={f.label}
            />
          </View>
        ))}

        <Text style={styles.fieldLabel}>Texto gerado</Text>
        <View style={styles.generatedBox}>
          <Text style={styles.generatedText} selectable>
            {generatedText}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleShare}
          style={styles.shareBtn}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar ou copiar carta"
        >
          <LinearGradient
            colors={Gradients.primary as unknown as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareGradient}
          >
            <Ionicons name="share-social-outline" size={16} color="#fff" />
            <Text style={styles.shareText}>Compartilhar / copiar</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.disclaimerBox}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.text.muted} />
          <Text style={styles.disclaimerText}>
            Seus dados (CPF, voo) ficam no seu device. Só saem quando você compartilha o texto.
          </Text>
        </View>
      </ScrollView>
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
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  content: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 13, color: Colors.text.secondary, lineHeight: 18, marginBottom: 20 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 10,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  fieldLabel: { fontSize: 12, color: Colors.text.secondary, fontWeight: '600', marginBottom: 6 },
  input: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  generatedBox: {
    backgroundColor: Colors.bg.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: 14,
    marginBottom: 16,
  },
  generatedText: { fontSize: 12, color: Colors.text.primary, lineHeight: 18 },
  shareBtn: { marginBottom: 16 },
  shareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  shareText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.bg.surface,
    padding: 12,
    borderRadius: 8,
  },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.text.muted, lineHeight: 15 },
});
