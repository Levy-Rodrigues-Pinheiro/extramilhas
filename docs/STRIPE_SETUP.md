# Stripe Setup — Ativando checkout real em produção

Tudo está pronto no código — esse guia só conecta as credenciais Stripe à
Fly.io. Até fazer isso, o `createCheckoutSession` roda em modo mock
(retorna um link fictício útil pra dev).

## 1. Criar conta Stripe (se ainda não tem)

1. Vá em https://dashboard.stripe.com/register
2. Complete o onboarding (dados de empresa, banco, etc.)
3. Ative o modo **Live** quando quiser receber de verdade. Até lá use
   **Test mode** — os secrets são diferentes (`sk_test_` vs `sk_live_`).

## 2. Criar 2 produtos (Premium + Pro), cada um com 2 preços (mensal + anual)

No Dashboard Stripe → **Products** → **Add product**:

### Premium
- Nome: "Milhas Extras Premium"
- Preço 1: R$ 14,90 recorrente mensal → guarda o `price_xxx` como
  `STRIPE_PREMIUM_PRICE_ID`
- Preço 2: R$ 149,00 recorrente anual → `STRIPE_PREMIUM_ANNUAL_PRICE_ID`

### Pro
- Nome: "Milhas Extras Pro"
- Preço 1: R$ 29,90/mês → `STRIPE_PRO_PRICE_ID`
- Preço 2: R$ 299,00/ano → `STRIPE_PRO_ANNUAL_PRICE_ID`

> **Dica**: desbloqueia WhatsApp só no Pro — o diferencial justifica
> o ticket mais caro.

## 3. Configurar webhook

Dashboard → **Developers** → **Webhooks** → **Add endpoint**:

- **Endpoint URL**: `https://milhasextras-api.fly.dev/api/v1/subscription/webhook`
- **Eventos a ouvir**:
  - `checkout.session.completed` (ativa plano após pagamento)
  - `invoice.payment_succeeded` (renova expiresAt mensalmente/anualmente)
  - `customer.subscription.deleted` (downgrade pra FREE no cancel)

Copia o **Signing secret** (`whsec_...`) — esse é o `STRIPE_WEBHOOK_SECRET`.

## 4. Setar secrets na Fly.io

```bash
cd C:/Users/SAP/Extramilhas/backend

flyctl secrets set \
  STRIPE_SECRET_KEY="sk_live_xxx" \
  STRIPE_WEBHOOK_SECRET="whsec_xxx" \
  STRIPE_PREMIUM_PRICE_ID="price_xxx" \
  STRIPE_PREMIUM_ANNUAL_PRICE_ID="price_xxx" \
  STRIPE_PRO_PRICE_ID="price_xxx" \
  STRIPE_PRO_ANNUAL_PRICE_ID="price_xxx" \
  FRONTEND_URL="https://milhasextras.com.br"
```

> **FRONTEND_URL** é o dominio que Stripe redireciona pós-checkout
> (success/cancel URLs). Se ainda não tem domínio próprio, pode usar
> `https://admin.milhasextras.com.br` temporariamente — o mobile abre
> o `checkoutUrl` em WebView e intercepta o redirect.

O `flyctl secrets set` reinicia a VM automaticamente. Pronto, checkout real.

## 5. Testar

1. No mobile com user FREE: toca em qualquer CTA `/subscription`
2. Seleciona Premium mensal
3. Backend cria session Stripe → retorna `checkoutUrl`
4. Mobile abre em WebView (ou sistema de browser)
5. Completa com cartão de teste `4242 4242 4242 4242` (test mode) ou
   cartão real (live mode)
6. Stripe chama webhook → backend upgrade plan + expiresAt
7. Mobile refaz fetch `/subscription` → ve plan='PREMIUM'
8. Oportunidades de arbitragem — antes 3 — viram 100% visíveis

## 6. Ver renovações e cancels no Dashboard

- **Subscriptions** lista todas as ativas. Ao cancelar por lá ou por
  `/subscription/portal` do user, webhook dispara e user vai pra FREE.
- **Invoices** mostra histórico de cobranças.

## Troubleshooting

- **Webhook 400 "Invalid signature"**: verifica que o `STRIPE_WEBHOOK_SECRET`
  corresponde ao endpoint correto (test vs live secrets são diferentes).
- **Checkout 404 price**: confere `STRIPE_*_PRICE_ID` — o ID começa com
  `price_`, não com `prod_`.
- **User ficou com expiresAt errado pra annual**: o fix já foi feito em
  `b02624c` — se ainda ver, verifica `period` no metadata da session.

---

## Fluxo Paywall atualmente implementado

```
Mobile: user FREE vê top 3 oportunidades + banner "+N ocultas"
       ↓ clica no banner
       → /subscription (seleção de plano)
       → chama POST /subscription/checkout { plan, period }
       → recebe checkoutUrl
       → abre Stripe Checkout (WebView ou browser)
       → user paga
       ↓
Stripe → webhook → backend upgrade User.subscriptionPlan
       ↓
Mobile refetch /arbitrage/transfer-bonuses → agora vê tudo
```
