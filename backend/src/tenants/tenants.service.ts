import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    return (this.prisma as any).tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(params: {
    slug: string;
    name: string;
    plan?: string;
    userQuota?: number;
    contactEmail?: string;
    logoUrl?: string;
    primaryColor?: string;
  }) {
    const clean = params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (clean.length < 3 || clean === 'default' || clean === 'admin') {
      throw new ForbiddenException('Slug inválido ou reservado');
    }
    return (this.prisma as any).tenant.create({
      data: {
        slug: clean,
        name: params.name,
        plan: params.plan ?? 'STARTER',
        userQuota: params.userQuota ?? 10,
        contactEmail: params.contactEmail,
        logoUrl: params.logoUrl,
        primaryColor: params.primaryColor,
      },
    });
  }

  async update(
    slug: string,
    params: {
      name?: string;
      plan?: string;
      userQuota?: number;
      isActive?: boolean;
      logoUrl?: string;
      primaryColor?: string;
      customDomain?: string;
    },
  ) {
    return (this.prisma as any).tenant.update({
      where: { slug },
      data: params,
    });
  }

  async stats(slug: string) {
    const tenant = await (this.prisma as any).tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    const userCount = await (this.prisma.user as any).count({
      where: { tenantSlug: slug },
    });
    return {
      tenant,
      users: {
        count: userCount,
        quota: tenant.userQuota,
        remaining: Math.max(0, tenant.userQuota - userCount),
      },
    };
  }
}
