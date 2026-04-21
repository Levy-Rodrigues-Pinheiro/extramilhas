import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsletterService {
  constructor(private prisma: PrismaService) {}

  private genToken(): string {
    return randomBytes(24).toString('base64url');
  }

  async subscribe(params: {
    email: string;
    source?: string;
    frequency?: string;
    tags?: string[];
  }) {
    const email = params.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new NotFoundException('Email inválido');
    }

    const existing = await (this.prisma as any).newsletterSubscription.findUnique({
      where: { email },
    });
    if (existing) {
      // Se veio unsub, reativa
      if (existing.unsubbedAt) {
        return (this.prisma as any).newsletterSubscription.update({
          where: { email },
          data: {
            unsubbedAt: null,
            confirmedAt: existing.confirmedAt ?? new Date(),
            source: params.source ?? existing.source,
            frequency: params.frequency ?? existing.frequency,
            tags: JSON.stringify(params.tags ?? (() => {
              try {
                return JSON.parse(existing.tags);
              } catch {
                return [];
              }
            })()),
          },
        });
      }
      return existing;
    }

    // Sem email service ativo → auto-confirma
    const emailEnabled =
      !!process.env.MAILGUN_API_KEY || !!process.env.RESEND_API_KEY;

    return (this.prisma as any).newsletterSubscription.create({
      data: {
        email,
        source: params.source ?? 'OTHER',
        frequency: params.frequency ?? 'WEEKLY_DIGEST',
        confirmToken: emailEnabled ? this.genToken() : null,
        confirmedAt: emailEnabled ? null : new Date(),
        unsubToken: this.genToken(),
        tags: JSON.stringify(params.tags ?? []),
      },
    });
  }

  async confirm(token: string) {
    const sub = await (this.prisma as any).newsletterSubscription.findUnique({
      where: { confirmToken: token },
    });
    if (!sub) throw new NotFoundException('Token inválido');
    return (this.prisma as any).newsletterSubscription.update({
      where: { email: sub.email },
      data: { confirmedAt: new Date(), confirmToken: null },
    });
  }

  async unsubscribe(token: string) {
    const sub = await (this.prisma as any).newsletterSubscription.findUnique({
      where: { unsubToken: token },
    });
    if (!sub) throw new NotFoundException('Token inválido');
    await (this.prisma as any).newsletterSubscription.update({
      where: { email: sub.email },
      data: { unsubbedAt: new Date() },
    });
    return { unsubbed: true };
  }

  async adminStats() {
    const [total, confirmed, unsubbed, bySource] = await Promise.all([
      (this.prisma as any).newsletterSubscription.count(),
      (this.prisma as any).newsletterSubscription.count({
        where: { confirmedAt: { not: null }, unsubbedAt: null },
      }),
      (this.prisma as any).newsletterSubscription.count({
        where: { unsubbedAt: { not: null } },
      }),
      (this.prisma as any).newsletterSubscription.groupBy({
        by: ['source'],
        _count: { _all: true },
      }),
    ]);
    return {
      total,
      activeConfirmed: confirmed,
      unsubbed,
      bySource,
    };
  }
}
