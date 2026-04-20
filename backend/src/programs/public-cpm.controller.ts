import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Endpoint público de CPM — alimenta o site marketing com dados live.
 * CORS wide-open via Header (aceita chamadas de qualquer origem → útil
 * pra rodar no landing/blog estático sem backend intermediário).
 *
 * Formato enxuto, cacheável CDN-friendly (Cache-Control 5min).
 */
@ApiTags('Public')
@Controller('public')
export class PublicCpmController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('cpm')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'CPM médio atual de todos programas ativos (público, CORS *)' })
  async cpm() {
    const programs = await this.prisma.loyaltyProgram.findMany({
      where: { isActive: true },
      orderBy: { avgCpmCurrent: 'asc' },
      select: {
        slug: true,
        name: true,
        avgCpmCurrent: true,
        logoUrl: true,
        websiteUrl: true,
        updatedAt: true,
      },
    });
    return successResponse({
      programs: programs.map((p) => ({
        slug: p.slug,
        name: p.name,
        avgCpm: parseFloat(Number(p.avgCpmCurrent).toFixed(4)),
        logoUrl: p.logoUrl,
        websiteUrl: p.websiteUrl,
        updatedAt: p.updatedAt,
      })),
      count: programs.length,
      generatedAt: new Date().toISOString(),
    });
  }

  /**
   * Stats agregadas pra prova social na landing.
   * Zero info sensitive — totais do sistema.
   */
  @Public()
  @Get('stats')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=600')
  @ApiOperation({ summary: 'Stats públicas da plataforma (prova social)' })
  async stats() {
    const now = new Date();
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const monthAgo = new Date(Date.now() - 30 * 86400_000);

    const [
      totalUsers,
      totalPrograms,
      approvedAllTime,
      approvedThisWeek,
      approvedThisMonth,
      activePartnerships,
      biggestBonus,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.loyaltyProgram.count({ where: { isActive: true } }),
      this.prisma.bonusReport.count({ where: { status: 'APPROVED' } }),
      this.prisma.bonusReport.count({
        where: { status: 'APPROVED', reviewedAt: { gte: weekAgo } },
      }),
      this.prisma.bonusReport.count({
        where: { status: 'APPROVED', reviewedAt: { gte: monthAgo } },
      }),
      this.prisma.transferPartnership.count({
        where: { isActive: true, currentBonus: { gt: 0 } },
      }),
      this.prisma.transferPartnership.findFirst({
        where: { isActive: true, currentBonus: { gt: 0 } },
        orderBy: { currentBonus: 'desc' },
        include: {
          fromProgram: { select: { name: true } },
          toProgram: { select: { name: true } },
        },
      }),
    ]);

    return successResponse({
      users: {
        total: totalUsers,
        formatted:
          totalUsers > 1000
            ? `${(totalUsers / 1000).toFixed(1)}k`
            : String(totalUsers),
      },
      programs: totalPrograms,
      bonuses: {
        allTime: approvedAllTime,
        thisWeek: approvedThisWeek,
        thisMonth: approvedThisMonth,
        activeNow: activePartnerships,
      },
      biggestActiveBonus: biggestBonus
        ? {
            from: biggestBonus.fromProgram.name,
            to: biggestBonus.toProgram.name,
            percent: Number(biggestBonus.currentBonus),
          }
        : null,
      generatedAt: now.toISOString(),
    });
  }

  /**
   * Transferências ativas com bônus — útil pro site mostrar "bônus da semana".
   */
  @Public()
  @Get('bonuses')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'Transfer bonuses ativos (público, CORS *)' })
  async bonuses() {
    const partnerships = await this.prisma.transferPartnership.findMany({
      where: { isActive: true, currentBonus: { gt: 0 } },
      orderBy: { currentBonus: 'desc' },
      take: 50,
      include: {
        fromProgram: { select: { slug: true, name: true } },
        toProgram: { select: { slug: true, name: true } },
      },
    });
    return successResponse({
      partnerships: partnerships.map((p) => ({
        from: p.fromProgram.slug,
        to: p.toProgram.slug,
        fromName: p.fromProgram.name,
        toName: p.toProgram.name,
        bonusPercent: Number(p.currentBonus),
        baseRate: Number(p.baseRate),
        expiresAt: p.expiresAt,
      })),
      count: partnerships.length,
      generatedAt: new Date().toISOString(),
    });
  }
}
