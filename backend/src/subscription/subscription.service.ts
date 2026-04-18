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

    // Production: use Stripe SDK
    try {
      // Dynamic import to avoid breaking when stripe isn't installed
      const Stripe = await import('stripe' as any).then((m: any) => m.default ?? m);
      const stripe = new (Stripe as any)(stripeKey, { apiVersion: '2024-06-20' });

      const priceIdKey =
        period === 'annual'
          ? `stripe.${plan.toLowerCase()}AnnualPriceId`
          : `stripe.${plan.toLowerCase()}PriceId`;

      const priceId = this.configService.get<string>(priceIdKey);

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { userId, plan, period },
        success_url: `${this.configService.get('frontendUrl')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get('frontendUrl')}/subscription/cancel`,
      });

      return { checkoutUrl: session.url, sessionId: session.id, isMock: false };
    } catch (err) {
      this.logger.error('Stripe checkout session creation failed', err);
      throw err;
    }
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
          const { userId, plan } = session.metadata ?? {};
          if (userId && plan) {
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
            await this.prisma.user.update({
              where: { id: userId },
              data: {
                subscriptionPlan: plan as SubscriptionPlan,
                subscriptionExpiresAt: expiresAt,
              },
            });
            this.logger.log(`Subscription upgraded: user=${userId} plan=${plan}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as any;
          const customerId = subscription.customer as string;
          // Look up user by stripe customer id if stored; for now log
          this.logger.log(`Subscription deleted for customer=${customerId}`);
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
