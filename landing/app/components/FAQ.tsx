'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'Como o Milhas Extras encontra os bônus de transferência?',
    a: 'Três vias em paralelo: (1) agentes inteligentes que monitoram sites e blogs especializados 24/7, (2) usuários reportam bônus que viram em newsletters, (3) páginas oficiais dos programas (Livelo, Esfera, etc.). Todo bônus passa por revisão humana antes de virar alerta na plataforma.',
  },
  {
    q: 'É grátis mesmo?',
    a: 'Sim. Plano FREE permite ver as 3 principais oportunidades do momento, cadastrar alertas básicos e acompanhar o valor da sua carteira. Planos Premium (R$ 14,90/mês) e Pro (R$ 29,90/mês) desbloqueiam todas as oportunidades, alertas ilimitados e notificações via WhatsApp.',
  },
  {
    q: 'Vocês têm acesso ao meu saldo de milhas?',
    a: 'Não. Você digita manualmente o saldo que tem em cada programa. A gente só usa esse número pra calcular quanto cada bônus vale em R$ pra sua carteira específica — nada é enviado pra terceiros.',
  },
  {
    q: 'Como ganho Premium grátis?',
    a: 'Indicando amigos. Cada amigo que se cadastra com seu código ganha 30 dias Premium e você ganha 30 dias adicionais — sem limite de indicações.',
  },
  {
    q: 'Por que meu bônus não aparece no app?',
    a: 'Bônus de transferência aparecem e somem em horas. Se você viu algum que não está listado, reporte pelo próprio app ("Reportar bônus") ou WhatsApp. Admin valida em minutos e todo mundo recebe.',
  },
  {
    q: 'É seguro? Vocês guardam cartão de crédito?',
    a: 'Pagamentos quando ativos rodam via Stripe (PCI Level 1). Nenhum dado de cartão toca nossos servidores. Dados pessoais mínimos: e-mail e nome. Política completa em /privacidade.',
  },
  {
    q: 'Vocês cobram comissão nas transferências?',
    a: 'Não. A gente não intermedeia nenhuma transferência. Só informa quando a janela está aberta — você transfere direto no app do programa.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="mb-2 text-center text-3xl font-bold md:text-4xl">
        Perguntas frequentes
      </h2>
      <p className="mb-10 text-center text-sm text-slate-400">
        Tudo que você precisa saber antes de começar
      </p>

      <div className="space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className={`overflow-hidden rounded-xl border transition-colors ${
                isOpen
                  ? 'border-purple-500/40 bg-slate-900/80'
                  : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-white md:text-base">
                  {item.q}
                </span>
                <span
                  className={`shrink-0 text-xl text-purple-400 transition-transform ${
                    isOpen ? 'rotate-45' : ''
                  }`}
                >
                  +
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-800 px-5 py-4 text-sm leading-relaxed text-slate-300">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Structured data pra SEO (Google FAQ rich results) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.a,
              },
            })),
          }),
        }}
      />
    </section>
  );
}
