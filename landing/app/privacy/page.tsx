import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Milhas Extras',
  description: 'Como tratamos seus dados pessoais.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold">Política de Privacidade</h1>
      <p className="mb-8 text-sm text-slate-500">Última atualização: abril/2026</p>

      <div className="space-y-6 text-slate-300 leading-relaxed">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">1. Dados que coletamos</h2>
          <ul className="ml-5 list-disc space-y-1 text-sm">
            <li>Nome e e-mail (cadastro obrigatório)</li>
            <li>WhatsApp (opcional, só com verificação SMS)</li>
            <li>Saldo de milhas que você digita manualmente (nunca consultamos programas por você)</li>
            <li>Device token pra push notifications (anônimo até você logar)</li>
            <li>Eventos de uso agregados (PostHog, anonimizados)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">2. O que NÃO coletamos</h2>
          <ul className="ml-5 list-disc space-y-1 text-sm">
            <li>Credenciais dos programas de milhas (Livelo, Smiles, etc.)</li>
            <li>Dados de cartão de crédito — processamento via Stripe (PCI Level 1)</li>
            <li>Contatos, localização precisa ou mídia do seu dispositivo</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">3. Por que coletamos</h2>
          <p className="text-sm">
            Somente pra operar o app: autenticar você, calcular o valor da sua carteira,
            notificar bônus que importam, processar assinatura quando aplicável. Sem vender
            seus dados pra terceiros.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">4. Seus direitos (LGPD)</h2>
          <p className="text-sm">
            Você pode solicitar acesso, correção ou exclusão completa dos seus dados a
            qualquer momento enviando e-mail pra <strong className="text-white">privacidade@milhasextras.com.br</strong>.
            Respondemos em até 15 dias corridos conforme a LGPD.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">5. Retenção</h2>
          <p className="text-sm">
            Dados ativos enquanto a conta existir. Após exclusão, apagamos tudo em até
            30 dias (backups rolam off em até 90 dias). Logs de auditoria podem ficar por
            até 2 anos pra compliance.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">6. Cookies e tracking</h2>
          <p className="text-sm">
            Landing usa cookies essenciais apenas. App mobile não usa cookies — estado
            roda em AsyncStorage local. PostHog analytics é opt-out via configurações do app.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">7. Terceiros</h2>
          <p className="text-sm">
            Integramos com: Supabase (banco), Fly.io (hosting), Expo (push notifications),
            Stripe (pagamentos futuros), Twilio (WhatsApp opcional), Anthropic (extração
            de bônus de páginas públicas). Todos têm suas próprias políticas de privacidade.
          </p>
        </section>

        <p className="mt-10 text-xs text-slate-500">
          <a href="/" className="underline hover:text-slate-400">← Voltar</a>
        </p>
      </div>
    </main>
  );
}
