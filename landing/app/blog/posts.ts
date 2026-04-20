/**
 * Posts do blog — inline TypeScript. Bom pra começar (3-5 posts) sem
 * complicar setup MDX. Quando virar 20+ posts, mover pra /content/*.mdx
 * e parsear com gray-matter.
 *
 * Cada post tem slug, title, date, excerpt, body (markdown simples),
 * tags, readMin (tempo estimado de leitura).
 */

export interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  body: string;
  tags?: string[];
  readMin: number;
  keywords?: string[];
}

export const POSTS: Post[] = [
  {
    slug: 'o-que-e-arbitragem-de-milhas',
    title: 'O que é arbitragem de milhas e por que você está perdendo dinheiro',
    date: '2026-04-15',
    readMin: 5,
    tags: ['iniciante', 'conceito'],
    keywords: ['arbitragem de milhas', 'bônus de transferência', 'livelo smiles'],
    excerpt:
      'Toda vez que você deixa pontos parados no Livelo sem transferir com bônus, está perdendo R$200-2.000/ano em valor. Aqui por quê.',
    body: `
## O problema

Você tem pontos Livelo. Acumula por anos. Um dia resolve transferir pra Smiles pra uma passagem. Faz a transferência no câmbio 1:1. Descobre depois que há 3 semanas a Livelo ofereceu 100% de bônus — seus 100.000 pontos poderiam ter virado 200.000 milhas Smiles.

**Perda real: ~R$ 2.000 em valor de passagens.**

É a diferença entre quem sabe arbitrar e quem não sabe.

## O que é arbitragem de milhas

Em economia, arbitragem é comprar barato num mercado e vender caro em outro — sem risco. Com milhas funciona assim:

- O CPM (custo por mil milhas) varia entre programas
- Promoções de transferência desequilibram temporariamente o câmbio entre eles
- Quem transfere **durante** a janela de bônus captura o ganho

Exemplo concreto (janela típica):

- Livelo CPM médio: R$ 25 por 1k pontos
- Smiles CPM médio: R$ 22 por 1k milhas
- Sem bônus, transferir 1:1 vira perda
- Com 100% bônus, 1.000 Livelo = 2.000 Smiles = **R$ 44** em vez de **R$ 22**

**Dobrou o valor, sem você gastar R$1.**

## Por que ninguém te avisa

Os programas não têm incentivo pra avisar. Blogs cobrem, mas saem dias depois. Grupos de Telegram compartilham entre amigos. A janela às vezes é de 48h — se você não tá monitorando, perdeu.

## A solução

Milhas Extras monitora 24/7 e manda push quando aparece bônus ≥ seu limite configurado. Crowdsource (usuários reportam) + agentes automáticos (LLM varre blogs e sites oficiais). Zero esforço seu.

[Baixe o app](/) — grátis pra começar, Premium desbloqueia todos os alertas.
`,
  },
  {
    slug: 'quanto-valem-suas-milhas-cpm',
    title: 'Quanto suas milhas valem de verdade (CPM explicado)',
    date: '2026-04-12',
    readMin: 4,
    tags: ['iniciante', 'conceito'],
    keywords: ['cpm milhas', 'valor milhas', 'quanto vale milha smiles'],
    excerpt:
      'CPM é a métrica que separa quem acumula milhas sem estratégia de quem ganha dinheiro. Entenda em 4 minutos.',
    body: `
## CPM = Custo Por Mil

A fórmula é simples: **quanto você pagaria por 1.000 milhas se fosse comprar hoje?**

- Smiles: ~R$ 22
- TudoAzul: ~R$ 25
- Latam Pass: ~R$ 28
- Livelo: ~R$ 25 (varia muito, é programa de pontos)

Importante: esses números são **médias de mercado**, não oficiais. Dependem da oferta de cada dia.

## Por que isso importa

Se você tem 100.000 Smiles, tem aproximadamente **R$ 2.200** em ativos. Se você transferir pra Latam Pass com 50% de bônus, vira 150.000 Latam = **R$ 4.200**. Você ganhou R$ 2.000 em valor de passagem.

Sem calcular o CPM, você não sabe quando vale a pena transferir.

## Quando vale transferir

Regra de bolso: **só transfira quando o CPM efetivo do destino for MENOR que o do origem após aplicar o bônus.**

A matemática:
\`\`\`
CPM_efetivo = CPM_origem / (1 + bônus/100)
\`\`\`

Exemplo:
- Livelo CPM R$ 25, bônus 100% pra Smiles
- CPM efetivo = 25 / (1 + 1) = R$ 12,50
- Smiles CPM médio R$ 22
- **Ganho = (22 - 12,50) / 22 = 43%**

Vale muito.

Com bônus de 30%:
- CPM efetivo = 25 / 1,30 = R$ 19,20
- Ganho = (22 - 19,20) / 22 = 12,7%
- Marginal — só transfira se precisar das milhas logo.

## No app

A calculadora automatiza isso. Você insere pontos + bônus, o app retorna:
- CPM efetivo
- Ganho em R$
- Recomendação clara (TRANSFERIR / ESPERAR / NÃO TRANSFERIR)
`,
  },
  {
    slug: 'estrategia-livelo-smiles',
    title: 'Estratégia Livelo → Smiles: como ganhar R$ 2.000/ano',
    date: '2026-04-10',
    readMin: 6,
    tags: ['estratégia', 'livelo', 'smiles'],
    keywords: ['livelo smiles estratégia', 'bônus livelo', '100% bônus smiles'],
    excerpt:
      'O par Livelo→Smiles tem bônus de 100% a cada 6-10 semanas. Quem tá preparado captura até R$ 2.000/ano em valor extra.',
    body: `
## Por que esse par é especial

Livelo e Smiles são os programas mais usados no Brasil e estão em marcas diferentes. Livelo quer reter clientes; Smiles precisa de liquidez. Quando o calendário bate, ambos ganham com o bônus — e oferecem 100% periodicamente.

**Padrão histórico**: bônus de 100% aparece ~6-10 semanas. Dura 48-72h.

## Como se preparar

1. **Acumule Livelo** — Cartões Santander (Esfera vira Livelo), Bradesco pontos conversíveis, compras em parceiros.
2. **Configure alerta** no app: tipo "Bônus de transferência" → Livelo → Smiles → mínimo 80%.
3. **Mantenha conta Smiles ativa** — cadastro é rápido, mas fazer no momento causa perder a janela.

## Na hora do bônus

Você recebe push. **Ação em ordem:**

1. Abre o app Milhas Extras, confirma % e validade
2. Abre o app ou site do Livelo
3. Vai em "Transferir pontos" → Smiles
4. Confirma com o bônus aplicado (aparece no resumo)

A transferência leva 24-48h pra cair. Não transfere quando já tem passagem em mente pra sair amanhã.

## Quanto isso rende

Se você tem saldo médio de **60.000 Livelo** e aproveita 4 bônus/ano:

- 60k × 2 (bônus 100%) = 120k Smiles por evento
- Ganho = 60.000 × R$ 22 / 1000 = **R$ 1.320 por evento**
- Anualizado: **~R$ 5.280/ano**

Mesmo conservador (saldo 20k, 2 eventos/ano) dá **R$ 880/ano**. Comparado a deixar pontos parados = R$ 0.

## Pitfalls

- **Não transfira tudo de uma vez** se tem planos diferentes. Smiles tem restrições de voo via pontos.
- **Livelo pode pedir cadastro de CPF no Smiles** antes da transferência — leva 24h. Prepare antes.
- **Bônus costuma ser "até 100%"** — às vezes só 80%. Checa o banner oficial.
`,
  },
];

export function getAllPosts(): Post[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
