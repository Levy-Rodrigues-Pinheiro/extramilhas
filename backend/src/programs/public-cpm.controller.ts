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
