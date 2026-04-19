# Guia: Configurar Meta Ads pra validação (Sem 0)

Objetivo: gastar **R$ 200** em 5-7 dias e capturar **>50 emails** na landing
pra provar que existe demanda real.

## Passo 1 — Criar conta Meta Business Manager (10 min, grátis)

1. Acesse **https://business.facebook.com**
2. **Create Account** (use seu Facebook pessoal)
3. Nome do negócio: `Milhas Extras`
4. Email: o seu

## Passo 2 — Criar Ad Account (5 min)

Dentro do Business Manager:
1. Settings → **Accounts → Ad Accounts**
2. **Add → Create new ad account**
3. Nome: `Milhas Extras Ads`
4. Time zone: `(GMT-3) Brasilia`
5. Currency: `BRL`
6. Add cartão de crédito (não cobra agora — só fica de garantia)

## Passo 3 — Criar campanha (15 min)

No **Ads Manager** (https://www.facebook.com/adsmanager):

### Campanha
- **Objective:** `Leads` (gera melhor lookalike depois) ou `Traffic` (mais barato CPC)
  - **Recomendo Traffic** pra validação inicial
- **Campaign budget:** R$ 30/dia × 7 dias = **R$ 210 total**
- **Buying type:** Auction

### Ad Set
- **Audience location:** Brasil
- **Age:** 25-50
- **Gender:** All
- **Detailed targeting** (combine com OR):
  - Travel
  - Frequent flyers
  - Travel hacking
  - Air Miles
  - Smiles, GOL, LATAM, Azul, Livelo (interest tags)
  - "Pontos de programa de fidelidade"
- **Estimated audience size:** 500k-3M (ajuste se ficar muito amplo)
- **Placements:** Manual → só Instagram + Feed Facebook
- **Optimization for ad delivery:** Link clicks

### Ad Creative

**Imagem 1 — vertical 1080×1350 (Instagram Feed):**
> Texto na imagem: "Você perdeu o bônus 100% Livelo→Smiles na semana passada?"
>
> Subtítulo: "Te avisamos antes da próxima."

**Imagem 2 — quadrada 1080×1080:**
> Texto: "Bônus de transferência duram 48h. Newsletter chega no dia seguinte. ⏰"

**Imagem 3 — vídeo 15s (opcional):**
> Tela do app com push notification chegando mostrando "+100% bônus AGORA"

### Copy do anúncio (Primary Text):

```
🚨 Você está perdendo bônus de milhas porque descobre tarde demais?

A gente te avisa em segundos quando aparece bônus de transferência:
• Livelo → Smiles 100%
• Esfera → Smiles 60%
• Latam Pass com pontos x2

Cadastra grátis e seja o primeiro a saber:
👉 [LINK DA LANDING]

#milhas #milhasaereas #viajarbarato
```

### URL de destino

Cole o link da landing com UTM:

```
https://milhasextras-landing.vercel.app/?utm_source=instagram&utm_medium=cpc&utm_campaign=validation-week-0
```

(O backend captura esses UTMs automaticamente)

## Passo 4 — Acompanhar diariamente (2 min/dia)

Métricas-alvo:

| Métrica | Bom | Ruim |
|---------|-----|------|
| **CPC** (custo por clique) | <R$ 1,50 | >R$ 3,00 |
| **CTR** (click-through rate) | >1,5% | <0,8% |
| **Conversão** (clique → email) | >5% | <2% |
| **CAC** (custo por email) | <R$ 4 | >R$ 10 |

**Se CTR <0,8%:** anúncio não chama atenção. Troca imagem/copy.
**Se conversão <2%:** landing não convence. Refaz headline/value prop.
**Se CAC >R$ 10:** público errado ou produto sem demanda. Revisita estratégia.

## Passo 5 — Decisão dia 7

```
Capturou >50 emails?       → SIM → Sprint 1 (push notifications)
Capturou 20-50?            → ITERAR (1 semana extra, +R$ 100)
Capturou <20?              → NÃO PROSSEGUIR. Pivota ou repensa.
```

## Acompanhar resultados sem entrar no Meta Ads

Endpoint admin (autenticado):
```
GET https://milhasextras-api.fly.dev/api/v1/waitlist/stats
```

Retorna:
```json
{
  "total": 87,
  "last7d": 87,
  "lastDay": 14,
  "bySource": [
    { "source": "instagram-ad-v1", "count": 67 },
    { "source": "landing-organic", "count": 20 }
  ],
  "willingToPay": { "avg": 9.74, "respondents": 52 }
}
```

## Custo total semana 0

- Meta Ads budget: R$ 210
- Landing hosting: R$ 0 (Vercel free)
- Backend: R$ 0 (já em prod)
- Tempo: ~5h seu (config + diário monitoring)

**Risco máximo: R$ 210.** Se não validar, aprende rápido + barato.
