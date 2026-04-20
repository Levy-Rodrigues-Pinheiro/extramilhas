/**
 * Tabela comparativa vs concorrência genérica. Zero calúnia — só fatos
 * abrangentes. Ajuda user a entender posicionamento.
 */
const FEATURES = [
  {
    name: 'Alertas em tempo real de bônus de transferência',
    mx: true,
    blogs: false,
    groups: true,
    apps: '⚠️ raro',
  },
  {
    name: 'Calcula valor da sua carteira em R$',
    mx: true,
    blogs: false,
    groups: false,
    apps: '⚠️ alguns',
  },
  {
    name: 'Recebe WhatsApp quando bônus aparece',
    mx: true,
    blogs: false,
    groups: '⚠️ manual',
    apps: false,
  },
  {
    name: 'Validação humana (zero falso positivo)',
    mx: true,
    blogs: '⚠️ viés',
    groups: false,
    apps: '⚠️ às vezes',
  },
  {
    name: 'Dados ao vivo + histórico de 90d',
    mx: true,
    blogs: false,
    groups: false,
    apps: false,
  },
  {
    name: 'Totalmente grátis pra começar',
    mx: true,
    blogs: true,
    groups: true,
    apps: '⚠️ só trial',
  },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true)
    return <span className="text-lg text-emerald-400" title="Sim">✓</span>;
  if (value === false)
    return <span className="text-lg text-slate-600" title="Não">✗</span>;
  return <span className="text-xs text-amber-400">{value}</span>;
}

export function ComparisonTable() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <h2 className="mb-2 text-center text-3xl font-bold md:text-4xl">
        Como se compara
      </h2>
      <p className="mb-10 text-center text-sm text-slate-400">
        Quais problemas o app resolve que as alternativas não resolvem
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Feature
              </th>
              <th className="px-3 py-3 text-center text-xs font-bold text-purple-400">
                Milhas Extras
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-400">
                Blogs
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-400">
                Grupos Telegram
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-slate-400">
                Outros apps
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? 'bg-slate-900/20' : ''}
              >
                <td className="px-4 py-3 text-sm text-white">{f.name}</td>
                <td className="px-3 py-3 text-center">
                  <Cell value={f.mx} />
                </td>
                <td className="px-3 py-3 text-center">
                  <Cell value={f.blogs} />
                </td>
                <td className="px-3 py-3 text-center">
                  <Cell value={f.groups} />
                </td>
                <td className="px-3 py-3 text-center">
                  <Cell value={f.apps} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
