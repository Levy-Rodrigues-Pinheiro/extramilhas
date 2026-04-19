import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Preferência de contribuição (crowdsourcing).
 *
 * Quando ativado, o WebView in-app captura as respostas de API da companhia
 * aérea e envia pro backend. Dados capturados:
 * - Preços em milhas, tarifas, voo, horários — TUDO público, visível na tela.
 *
 * NÃO capturado:
 * - Credenciais, saldo de milhas pessoal, histórico de compras, cookies.
 *
 * O usuário pode desativar a qualquer momento em Perfil > Preferências.
 */

const KEY = 'milhasextras:contribute:v1';

export type ContributeState = 'unset' | 'accepted' | 'declined';

export async function getContributeState(): Promise<ContributeState> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === 'accepted' || v === 'declined') return v;
    return 'unset';
  } catch {
    return 'unset';
  }
}

export async function setContributeState(state: 'accepted' | 'declined'): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, state);
  } catch {
    /* ignore */
  }
}
