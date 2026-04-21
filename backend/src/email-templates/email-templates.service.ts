import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailTemplatesService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return (this.prisma as any).emailTemplate.findMany({
      orderBy: { slug: 'asc' },
    });
  }

  async getBySlug(slug: string) {
    const t = await (this.prisma as any).emailTemplate.findUnique({
      where: { slug },
    });
    if (!t) throw new NotFoundException('Template não encontrado');
    return t;
  }

  async upsert(params: {
    slug: string;
    subject: string;
    body: string;
    bodyText?: string;
    isActive?: boolean;
  }) {
    return (this.prisma as any).emailTemplate.upsert({
      where: { slug: params.slug },
      create: {
        slug: params.slug,
        subject: params.subject,
        body: params.body,
        bodyText: params.bodyText,
        isActive: params.isActive ?? false,
      },
      update: {
        subject: params.subject,
        body: params.body,
        bodyText: params.bodyText,
        isActive: params.isActive,
      },
    });
  }

  async delete(slug: string) {
    await (this.prisma as any).emailTemplate.deleteMany({ where: { slug } });
    return { deleted: true };
  }

  /**
   * Substitui placeholders {{user.name}} etc. Simples — não faz eval.
   *
   * Bug fix HONEST_TEST_REPORT #15: antes retornava `{{user.name}}` raw
   * se path não resolvesse, deixando placeholder visível no email.
   * Agora substitui por empty + loga warn. Com strictMode=true, throws.
   */
  render(
    template: string,
    vars: Record<string, any>,
    options: { strictMode?: boolean } = {},
  ): string {
    const missing: string[] = [];
    const result = template.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
      const parts = (path as string).split('.');
      let v: any = vars;
      for (const p of parts) {
        if (v != null && typeof v === 'object' && p in v) v = v[p];
        else {
          missing.push(path);
          return '';
        }
      }
      return v == null ? '' : String(v);
    });
    if (missing.length > 0) {
      if (options.strictMode) {
        throw new Error(`Placeholders não resolvidos: ${missing.join(', ')}`);
      }
      // eslint-disable-next-line no-console
      console.warn(`[email-template] placeholders missing: ${missing.join(', ')}`);
    }
    return result;
  }

  /**
   * Preview com vars fake pro admin validar antes de publicar.
   * Retorna missingPlaceholders pra UI mostrar warnings.
   */
  async previewBySlug(
    slug: string,
    vars?: Record<string, any>,
  ): Promise<{
    subject: string;
    body: string;
    bodyText: string | null;
    missingPlaceholders: string[];
  }> {
    const t = await this.getBySlug(slug);
    const fakeVars = vars ?? {
      user: { name: 'João Silva', email: 'joao@example.com', plan: 'PREMIUM' },
      days: 3,
      bonusCount: 5,
      walletValue: '1234.56',
      streak: 14,
      resetUrl: 'https://milhasextras.com.br/reset?token=abc',
    };
    const missing: string[] = [];
    const capture = (template: string): string =>
      template.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
        const parts = (path as string).split('.');
        let v: any = fakeVars;
        for (const p of parts) {
          if (v != null && typeof v === 'object' && p in v) v = v[p];
          else {
            if (!missing.includes(path)) missing.push(path);
            return `<<MISSING:${path}>>`;
          }
        }
        return v == null ? '' : String(v);
      });
    return {
      subject: capture(t.subject),
      body: capture(t.body),
      bodyText: t.bodyText ? capture(t.bodyText) : null,
      missingPlaceholders: missing,
    };
  }
}
