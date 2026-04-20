const TESTIMONIALS = [
  {
    name: 'Carla, SP',
    role: 'Premium há 4 meses',
    text: 'Tinha 200k Livelo parado e não sabia pra onde transferir. Primeiro alerta veio no WhatsApp, transferi no mesmo dia com 100% de bônus — R$ 1.400 em passagens que não teria.',
    avatar: '👩',
  },
  {
    name: 'Ricardo, RJ',
    role: 'Reporter nível Gold',
    text: 'Gosto de reportar os bônus que vejo nas newsletters. Resultado: ganhei 6 meses Premium grátis via missões. É ganha-ganha.',
    avatar: '🧔',
  },
  {
    name: 'Juliana, MG',
    role: 'Pro há 2 meses',
    text: 'A calculadora já vale o plano sozinha. Transfere e ela mostra quanto você tá ganhando em R$ de verdade. Antes eu olhava no olhômetro.',
    avatar: '👩‍💼',
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-2 text-center text-3xl font-bold md:text-4xl">
        O que os usuários dizem
      </h2>
      <p className="mb-10 text-center text-sm text-slate-400">
        Depoimentos reais de quem virou cliente ativo
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur"
          >
            <div className="mb-3 text-3xl">{t.avatar}</div>
            <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-300">
              "{t.text}"
            </p>
            <div className="text-xs">
              <p className="font-semibold text-white">{t.name}</p>
              <p className="text-slate-500">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
