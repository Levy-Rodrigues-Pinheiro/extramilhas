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
   * Se future needs demand, migrar pra handlebars.
   */
  render(template: string, vars: Record<string, any>): string {
    return template.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
      const parts = (path as string).split('.');
      let v: any = vars;
      for (const p of parts) {
        if (v && typeof v === 'object' && p in v) v = v[p];
        else return `{{${path}}}`;
      }
      return String(v ?? '');
    });
  }
}
