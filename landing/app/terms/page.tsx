import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso — Milhas Extras',
  description: 'Regras pra usar o serviço.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold">Termos de Uso</h1>
      <p className="mb-8 text-sm text-slate-500">Última atualização: abril/2026</p>

      <div className="space-y-6 text-slate-300 leading-relaxed">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">1. O que somos</h2>
          <p className="text-sm">
            Milhas Extras é um agregador independente de informações sobre bônus de
            transferência entre programas de fidelidade brasileiros. Não somos parceiros
            oficiais de Livelo, Smiles, TudoAzul, Latam Pass, Esfera ou qualquer outro
            programa. Marcas citadas pertencem aos respectivos donos.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">2. Natureza informativa</h2>
          <p className="text-sm">
            Todas as oportunidades mostradas são informativas. Antes de transferir milhas,
            confirme no site oficial do programa. Não nos responsabilizamos por:
          </p>
          <ul className="ml-5 mt-2 list-disc space-y-1 text-sm">
            <li>Bônus que mudem ou expirem antes da sua transferência</li>
            <li>Erros em cálculos que dependem de CPMs médios estimados</li>
            <li>Alterações unilaterais dos programas nas regras ou valores</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">3. Conta e segurança</h2>
          <p className="text-sm">
            Você é responsável pela segurança da sua conta. Se detectarmos uso abusivo
            (múltiplas contas pra farmar referral, spam de bonus reports, etc.) podemos
            suspender sem aviso prévio.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">4. Planos pagos</h2>
          <p className="text-sm">
            Quando ativos, assinaturas Premium e Pro renovam automaticamente. Cancelamento
            disponível a qualquer momento via portal Stripe no próprio app — cobertura
            continua até o fim do período já pago, sem reembolso proporcional.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">5. Crowdsource de bônus</h2>
          <p className="text-sm">
            Ao reportar um bônus, você concede ao Milhas Extras licença não exclusiva pra
            republicar a informação agregada (sem identificar você) pra outros usuários.
            Reports maliciosos levam a banimento + perda de tier no leaderboard.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">6. Modificação dos termos</h2>
          <p className="text-sm">
            Podemos atualizar estes termos. Mudanças materiais serão comunicadas por
            e-mail ou in-app com pelo menos 15 dias de antecedência.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-white">7. Contato</h2>
          <p className="text-sm">
            Dúvidas: <strong className="text-white">contato@milhasextras.com.br</strong>
          </p>
        </section>

        <p className="mt-10 text-xs text-slate-500">
          <a href="/" className="underline hover:text-slate-400">← Voltar</a>
        </p>
      </div>
    </main>
  );
}
