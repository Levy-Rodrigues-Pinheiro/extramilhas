import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';

interface PlanFeatures {
  plan: SubscriptionPlan;
  maxAlerts: number;
  realtimeOffers: boolean;
  calculatorAccess: boolean;
  simulatorAccess: boolean;
  proContent: boolean;
  prioritySupport: boolean;
}

const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  FREE: {
    plan: SubscriptionPlan.FREE,
    maxAlerts: 1,
    realtimeOffers: false,
    calculatorAccess: true,
    simulatorAccess: false,
    proContent: false,
    prioritySupport: false,
  },
  PREMIUM: {
    plan: SubscriptionPlan.PREMIUM,
    maxAlerts: 10,
    realtimeOffers: true,
    calculatorAccess: true,
    simulatorAccess: true,
    proContent: false,
    prioritySupport: false,
  },
  PRO: {
    plan: SubscriptionPlan.PRO,
    maxAlerts: -1, // unlimited
    realtimeOffers: true,
    calculatorAccess: true,
    simulatorAccess: true,
    proContent: true,
    prioritySupport: true,
  },
};

const STRIPE_PRICE_IDS: Record<string, Record<string, string>> = {
  PREMIUM: { monthly: 'STRIPE_PREMIUM_PRICE_ID', annual: 'STRIPE_PREMIUM_ANNUAL_PRICE_ID' },
  PRO: { monthly: 'STRIPE_PRO_PRICE_ID', annual: 'STRIPE_PRO_ANNUAL_PRICE_ID' },
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getSubscription(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const features = this.getPlanFeatures(user.subscriptionPlan as SubscriptionPlan);

    return {
      plan: user.subscriptionPlan,
      expiresAt: user.subscriptionExpiresAt,
      features,
    };
  }

  async createCheckoutSession(
    userId: string,
    plan: 'PREMIUM' | 'PRO',
    period: 'monthly' | 'annual',
  ) {
    const stripeKey = this.configService.get<string>('stripe.secretKey');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeCustomerId: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (!stripeKey) {
      // Development mock
      this.logger.log(
        `[DEV] Mock checkout session for user=${userId} plan=${plan} period=${period}`,
      );
      return {
        checkoutUrl: `http://localhost:3000/subscription/mock-checkout?plan=${plan}&period=${period}&userId=${userId}`,
        sessionId: `mock_session_${Date.now()}`,
        isMock: true,
      };
    }

    try {
      const Stripe = await import('stripe' as any).then((m: any) => m.default ?? m);
      const stripe = new (Stripe as any)(stripeKey, { apiVersion: '2024-06-20' });

      // Reusa customer se já temos; senão cria e persiste
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        customerId = customer.id as string;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
      }

      const priceIdKey =
        period === 'annual'
          ? `stripe.${plan.toLowerCase()}AnnualPriceId`
          : `stripe.${plan.toLowerCase()}PriceId`;
      const priceId = this.configService.get<string>(priceIdKey);

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        // metadata vai no session E na subscription criada — ambos caminhos úteis no webhook
        metadata: { userId, plan, period },
        subscription_data: { metadata: { userId, plan, period } },
        success_url: `${this.configService.get('frontendUrl')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get('frontendUrl')}/subscription/cancel`,
      });

      return { checkoutUrl: session.url, sessionId: session.id, isMock: false };
    } catch (err) {
      this.logger.error('Stripe checkout session creation failed', err);
      throw err;
    }
  }

  /**
   * Portal Stripe pra usuário gerenciar assinatura (trocar cartão, cancelar).
   * Muito melhor UX que chamar cancel direto — e atende requisitos de compliance.
   */
  async createPortalSession(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      throw new NotFoundException('Usuário não tem assinatura ativa pra gerenciar');
    }
    const stripeKey = this.configService.get<string>('stripe.secretKey');
    if (!stripeKey) {
      return { portalUrl: 'http://localhost:3000/subscription/mock-portal', isMock: true };
    }
    const Stripe = await import('stripe' as any).then((m: any) => m.default ?? m);
    const stripe = new (Stripe as any)(stripeKey, { apiVersion: '2024-06-20' });
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${this.configService.get('frontendUrl')}/subscription`,
    });
    return { portalUrl: session.url, isMock: false };
  }

  async cancelSubscription(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: SubscriptionPlan.FREE,
        subscriptionExpiresAt: null,
      },
    });

    return { message: 'Subscription cancelled. Your plan has been downgraded to FREE.' };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const stripeKey = this.configService.get<string>('stripe.secretKey');
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');

    if (!stripeKey || !webhookSecret) {
      this.logger.log('[DEV] Stripe webhook received (no keys configured - skipping verification)');
      return { received: true };
    }

    try {
      const Stripe = await import('stripe' as any).then((m: any) => m.default ?? m);
      const stripe = new (Stripe as any)(stripeKey, { apiVersion: '2024-06-20' });

      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const { userId, plan, period } = session.metadata ?? {};
          const customerId = session.customer as string | undefined;
          if (userId && plan) {
            // FIX: respeita o period real (bug antigo sempre adicionava 1 mês)
            const expiresAt = new Date();
            if (period === 'annual') {
              expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            } else {
              expiresAt.setMonth(expiresAt.getMonth() + 1);
            }
            await this.prisma.user.update({
              where: { id: userId },
              data: {
                subscriptionPlan: plan as SubscriptionPlan,
                subscriptionExpiresAt: expiresAt,
                // Garante stripeCustomerId persistido (caso checkout via portal)
                ...(customerId ? { stripeCustomerId: customerId } : {}),
              },
            });
            this.logger.log(
              `Subscription upgraded: user=${userId} plan=${plan} period=${period || 'monthly'} until=${expiresAt.toISOString()}`,
            );
          }
          break;
        }

        // Renovação recorrente — estende expiresAt
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as any;
          const customerId = invoice.customer as string;
          const periodEnd = invoice.lines?.data?.[0]?.period?.end; // unix seconds
          if (!customerId) break;
          const user = await this.prisma.user.findUnique({
            where: { stripeCustomerId: customerId },
            select: { id: true, subscriptionPlan: true },
          });
          if (!user) break;
          if (periodEnd) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { subscriptionExpiresAt: new Date(periodEnd * 1000) },
            });
            this.logger.log(
              `Subscription renewed: user=${user.id} until=${new Date(periodEnd * 1000).toISOString()}`,
            );
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const customerId = subscription.customer as string;
          if (!customerId) break;
          const user = await this.prisma.user.findUnique({
            where: { stripeCustomerId: customerId },
            select: { id: true },
          });
          if (user) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionPlan: SubscriptionPlan.FREE,
                subscriptionExpiresAt: null,
              },
            });
            this.logger.log(`Subscription cancelled: user=${user.id}`);
          } else {
            this.logger.warn(`Cancel webhook sem match de User: customerId=${customerId}`);
          }
          break;
        }

        default:
          this.logger.log(`Unhandled Stripe event: ${event.type}`);
      }

      return { received: true };
    } catch (err) {
      this.logger.error('Stripe webhook handling failed', err);
      throw err;
    }
  }

  getPlanFeatures(plan: SubscriptionPlan): PlanFeatures {
    return PLAN_FEATURES[plan] ?? PLAN_FEATURES.FREE;
  }
}
