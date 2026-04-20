'use client';

import { useState, useEffect } from 'react';
import { LiveBonuses } from './components/LiveBonuses';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://milhasextras-api.fly.dev/api/v1';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [willingToPay, setWillingToPay] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utmParams, setUtmParams] = useState<Record<string, string>>({});

  // Captura UTM params da URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const captured: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'source'].forEach((k) => {
      const v = params.get(k);
      if (v) captured[k] = v;
    });
    setUtmParams(captured);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/waitlist/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          whatsappPhone: whatsapp.trim() || undefined,
          willingToPay: willingToPay === '' ? undefined : Number(willingToPay),
          source: utmParams.source || utmParams.utm_source || 'landing-organic',
          utmSource: utmParams.utm_source,
          utmMedium: utmParams.utm_medium,
          utmCampaign: utmParams.utm_campaign,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Não foi possível cadastrar. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="px-6 pt-16 pb-20 max-w-3xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-bg-secondary border border-accent-purple/30">
          <span className="text-xs font-semibold text-accent-purple uppercase tracking-wider">
            🚀 Em desenvolvimento — entrada antecipada grátis
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Avisos instantâneos de{' '}
          <span className="bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent">
            bônus de milhas
          </span>
          {' '}no seu celular
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
          Quando Livelo, Esfera, Smiles, TudoAzul ou Latam Pass oferecerem bônus de transferência,{' '}
          <span className="text-white font-semibold">você recebe push em segundos</span> — antes da
          newsletter, antes do blog, antes que acabe.
        </p>

        {/* Form */}
        {!success ? (
          <form
            onSubmit={handleSubmit}
            className="bg-bg-secondary border border-slate-700 rounded-2xl p-6 md:p-8 max-w-md mx-auto text-left"
          >
            <label className="block text-sm font-semibold mb-1.5">Seu email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="w-full px-4 py-3 mb-4 rounded-lg bg-bg-primary border border-slate-700 focus:border-accent-purple focus:outline-none text-white"
            />

            <label className="block text-sm font-semibold mb-1.5">
              WhatsApp <span className="text-slate-500 font-normal">(opcional, alertas urgentes)</span>
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="w-full px-4 py-3 mb-4 rounded-lg bg-bg-primary border border-slate-700 focus:border-accent-purple focus:outline-none text-white"
            />

            <label className="block text-sm font-semibold mb-1.5">
              Quanto você pagaria por mês?{' '}
              <span className="text-slate-500 font-normal">(seja honesto, ajuda a precificar)</span>
            </label>
            <select
              value={willingToPay}
              onChange={(e) => setWillingToPay(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-4 py-3 mb-6 rounded-lg bg-bg-primary border border-slate-700 focus:border-accent-purple focus:outline-none text-white"
            >
              <option value="">Prefiro não responder</option>
              <option value="0">Só usaria se fosse grátis</option>
              <option value="4.9">Até R$ 4,90/mês</option>
              <option value="9.9">R$ 9,90/mês</option>
              <option value="14.9">R$ 14,90/mês</option>
              <option value="19.9">R$ 19,90/mês</option>
              <option value="29.9">Mais que R$ 19,90/mês</option>
            </select>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-accent-purple to-accent-blue text-white font-semibold py-4 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Quero receber os avisos →'}
            </button>

            {error && (
              <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
            )}

            <p className="mt-4 text-xs text-slate-500 text-center">
              Sem spam. Sem cobrança automática. Você pode cancelar a qualquer momento.
            </p>
          </form>
        ) : (
          <div className="bg-bg-secondary border-2 border-accent-emerald rounded-2xl p-8 max-w-md mx-auto">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-accent-emerald mb-3">Tá feito!</h2>
            <p className="text-slate-300">
              Te avisamos quando o app estiver pronto pra primeiro bônus.{' '}
              <span className="text-white font-semibold">Você é prioridade — entrada grátis garantida.</span>
            </p>
          </div>
        )}
      </section>

      {/* Widget de bônus ao vivo — credibilidade + SEO dinâmico */}
      <section className="px-6 py-8 max-w-3xl mx-auto">
        <LiveBonuses />
      </section>

      {/* Por que */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Por que perder dinheiro <span className="text-accent-amber">por causa de timing?</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon="⚡"
            title="Velocidade real"
            text="Bônus duram 24-72h. Newsletter chega no dia seguinte. Você perde. Aqui chega em segundos."
          />
          <FeatureCard
            icon="🎯"
            title="Personalizado"
            text="Sabemos seu saldo real (você cadastra). Calculamos quanto VOCÊ ganha — não exemplo genérico."
          />
          <FeatureCard
            icon="📊"
            title="Histórico inteligente"
            text="Bônus 100% Livelo→Smiles aparece de novo? Mostramos quando isso aconteceu nos últimos 12 meses."
          />
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Plano simples</h2>
        <p className="text-slate-400 text-center mb-12">Sem pegadinha. Sem trial enganoso.</p>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <PricingCard
            tier="FREE"
            price="R$ 0"
            highlight={false}
            features={[
              'Avisos com 24h de delay',
              'Até 3 alertas customizados',
              'Histórico de 1 mês',
            ]}
          />
          <PricingCard
            tier="PRO"
            price="R$ 9,90/mês"
            highlight
            features={[
              '✨ Avisos instantâneos (segundos)',
              '✨ Alertas ilimitados',
              '✨ Histórico completo (12+ meses)',
              '✨ Cálculo personalizado por saldo',
              '✨ Cancela quando quiser',
              '7 dias grátis pra testar',
            ]}
          />
        </div>
        <p className="text-center text-xs text-slate-500 mt-8">
          *Preços em validação. Quem se cadastrar agora trava esse preço pra sempre, mesmo que suba.
        </p>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Perguntas frequentes</h2>
        <div className="space-y-4">
          <FAQItem
            q="Vocês são ligados a Livelo, Smiles, etc.?"
            a="Não. Somos independentes. Apenas monitoramos o que essas empresas tornam público (newsletters, sites) e te avisamos."
          />
          <FAQItem
            q="Quando vai ficar pronto?"
            a="Em 4-6 semanas. Quem se cadastra agora recebe convite antes do lançamento público + entrada gratuita no PRO por 30 dias."
          />
          <FAQItem
            q="Como vão ganhar dinheiro?"
            a="Plano PRO R$ 9,90/mês pra quem quer avisos instantâneos e sem limite. Plano grátis pra sempre, pra quem aceita 24h de delay."
          />
          <FAQItem
            q="E se eu não tiver milhas?"
            a="O app funciona mesmo assim — mostra ranking de oportunidades genérico. Mas pra cálculo personalizado, você cadastra seus saldos (sem login nas companhias, só o número você digita)."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>© 2026 Milhas Extras · feito com ❤️ pra quem viaja com milhas</p>
        <p className="mt-2 text-xs">
          Não somos parceiros oficiais de Livelo, Smiles, TudoAzul, Latam Pass ou Esfera. Marcas
          registradas são de seus respectivos donos.
        </p>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-bg-secondary border border-slate-700 rounded-2xl p-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function PricingCard({
  tier,
  price,
  features,
  highlight,
}: {
  tier: string;
  price: string;
  features: string[];
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 ${
        highlight
          ? 'bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 border-2 border-accent-purple'
          : 'bg-bg-secondary border border-slate-700'
      }`}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-xl font-bold">{tier}</h3>
        <span className={`text-2xl font-bold ${highlight ? 'text-accent-purple' : ''}`}>{price}</span>
      </div>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="text-sm text-slate-300 flex gap-2">
            <span>•</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="bg-bg-secondary border border-slate-700 rounded-lg p-5 group">
      <summary className="font-semibold cursor-pointer flex items-center justify-between">
        <span>{q}</span>
        <span className="text-accent-purple group-open:rotate-180 transition">▾</span>
      </summary>
      <p className="mt-3 text-slate-400 text-sm leading-relaxed">{a}</p>
    </details>
  );
}
