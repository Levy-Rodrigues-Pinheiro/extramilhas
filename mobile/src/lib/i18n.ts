import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

/**
 * i18n bootstrap — pt-BR (default) + en-US.
 *
 * Design: translations inline (sem arquivos separados) pra começar
 * simples. Quando crescer > 200 chaves, mover pra /locales/pt.json
 * e /locales/en.json e usar dynamic import.
 *
 * Uso:
 *   import { useTranslation } from 'react-i18next';
 *   const { t } = useTranslation();
 *   <Text>{t('home.greeting')}</Text>
 *
 * Fallback: se chave não existir, renderiza a própria chave (bug visível).
 */

const resources = {
  pt: {
    translation: {
      common: {
        cancel: 'Cancelar',
        save: 'Salvar',
        continue: 'Continuar',
        back: 'Voltar',
        loading: 'Carregando...',
        error: 'Erro',
        success: 'Sucesso',
        try_again: 'Tentar novamente',
      },
      auth: {
        login: 'Entrar',
        register: 'Criar conta',
        email: 'E-mail',
        password: 'Senha',
        name: 'Nome',
        logout: 'Sair',
        forgot_password: 'Esqueci minha senha',
      },
      home: {
        greeting: 'Olá! 👋',
        subtitle: 'Suas milhas, sua arbitragem',
        wallet_label: 'Sua carteira vale',
        add_balance: 'Cadastre seus saldos →',
        programs_count_one: '{{count}} programa',
        programs_count_other: '{{count}} programas',
        quick_calc: 'Vale a pena?',
        quick_opportunities: 'Oportunidades',
        quick_alerts: 'Alertas',
        top_bonuses: '🔥 Bônus ativos agora',
        view_all: 'Ver todos →',
        no_bonuses: 'Nenhum bônus de transferência ativo agora.',
        no_bonuses_notice: 'Te avisamos por push quando aparecer um.',
      },
      arbitrage: {
        title: 'Oportunidades de arbitragem',
        subtitle: 'Bônus de transferência ativos',
        classification_imperdivel: '🔥 IMPERDÍVEL',
        classification_boa: '⚡ BOA',
        classification_normal: 'NORMAL',
        gain_label: 'Ganho de {{percent}}% em valor',
        report_cta_title: 'Viu um bônus que não está aqui?',
        report_cta_text: 'Reporta — vira oportunidade pra todo mundo →',
      },
      paywall: {
        locked_count_one: '+{{count}} oportunidade oculta',
        locked_count_other: '+{{count}} oportunidades ocultas',
        upgrade_pitch: 'Desbloqueie TODOS os bônus + alertas em tempo real no Premium',
        locked_preview: 'Oferta exclusiva Premium',
      },
      missions: {
        title: 'Missões',
        subtitle: 'Ganhe dias Premium grátis',
        progress: 'Progresso: {{current}}/{{target}}',
        claim_btn: 'Resgatar {{days}}d Premium',
        claimed_on: 'Resgatado {{date}}',
      },
      referral: {
        title: 'Indique e ganhe',
        subtitle: '30 dias Premium pra cada amigo',
        your_code: 'SEU CÓDIGO',
        copy: 'Copiar',
        share: 'Compartilhar',
      },
    },
  },
  en: {
    translation: {
      common: {
        cancel: 'Cancel',
        save: 'Save',
        continue: 'Continue',
        back: 'Back',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        try_again: 'Try again',
      },
      auth: {
        login: 'Log in',
        register: 'Sign up',
        email: 'E-mail',
        password: 'Password',
        name: 'Name',
        logout: 'Log out',
        forgot_password: 'Forgot password',
      },
      home: {
        greeting: 'Hi! 👋',
        subtitle: 'Your miles, your arbitrage',
        wallet_label: 'Your wallet is worth',
        add_balance: 'Add your balances →',
        programs_count_one: '{{count}} program',
        programs_count_other: '{{count}} programs',
        quick_calc: 'Worth it?',
        quick_opportunities: 'Opportunities',
        quick_alerts: 'Alerts',
        top_bonuses: '🔥 Active bonuses',
        view_all: 'View all →',
        no_bonuses: 'No transfer bonuses active right now.',
        no_bonuses_notice: "We'll notify you when one appears.",
      },
      arbitrage: {
        title: 'Arbitrage opportunities',
        subtitle: 'Active transfer bonuses',
        classification_imperdivel: '🔥 AMAZING',
        classification_boa: '⚡ GOOD',
        classification_normal: 'NORMAL',
        gain_label: '{{percent}}% value gain',
        report_cta_title: "Saw a bonus that's not here?",
        report_cta_text: 'Report it — becomes an opportunity for everyone →',
      },
      paywall: {
        locked_count_one: '+{{count}} hidden opportunity',
        locked_count_other: '+{{count}} hidden opportunities',
        upgrade_pitch: 'Unlock ALL bonuses + real-time alerts with Premium',
        locked_preview: 'Premium exclusive',
      },
      missions: {
        title: 'Missions',
        subtitle: 'Earn free Premium days',
        progress: 'Progress: {{current}}/{{target}}',
        claim_btn: 'Claim {{days}}d Premium',
        claimed_on: 'Claimed {{date}}',
      },
      referral: {
        title: 'Refer & earn',
        subtitle: '30 Premium days per friend',
        your_code: 'YOUR CODE',
        copy: 'Copy',
        share: 'Share',
      },
    },
  },
};

const deviceLang = Localization.getLocales()[0]?.languageCode || 'pt';
const initialLang = deviceLang.startsWith('pt') ? 'pt' : 'en';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources,
  lng: initialLang,
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
