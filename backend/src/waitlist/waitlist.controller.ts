import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { successResponse } from '../common/helpers/response.helper';
import { PrismaService } from '../prisma/prisma.service';

class WaitlistSignupDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+5511999998888' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappPhone?: string;

  @ApiPropertyOptional({ example: 'instagram-ad-v1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) utmSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) utmMedium?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) utmCampaign?: string;

  @ApiPropertyOptional({ example: 9.9 })
  @IsOptional()
  @IsNumber()
  willingToPay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

/**
 * Captura de leads pré-lançamento.
 *
 * Endpoint público pra landing page. Throttle agressivo (10 req/min por IP)
 * pra evitar bot spam. Email único — re-signup do mesmo email só atualiza
 * source/utm sem criar duplicata.
 */
@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  private readonly logger = new Logger(WaitlistController.name);

  constructor(private prisma: PrismaService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cadastra email/whatsapp na lista de espera (landing page)' })
  @ApiBody({ type: WaitlistSignupDto })
  async signup(@Body() body: WaitlistSignupDto) {
    const email = body.email.trim().toLowerCase();

    const existing = await this.prisma.waitlistSignup.findUnique({ where: { email } });

    if (existing) {
      // Re-signup: atualiza source/utm + sinal de "ainda interessado"
      const updated = await this.prisma.waitlistSignup.update({
        where: { email },
        data: {
          whatsappPhone: body.whatsappPhone || existing.whatsappPhone,
          source: body.source || existing.source,
          utmSource: body.utmSource || existing.utmSource,
          utmMedium: body.utmMedium || existing.utmMedium,
          utmCampaign: body.utmCampaign || existing.utmCampaign,
          willingToPay: body.willingToPay ?? existing.willingToPay,
          message: body.message || existing.message,
        },
        select: { id: true, email: true, createdAt: true },
      });
      this.logger.log(`Waitlist re-signup: ${email}`);
      return successResponse({ ...updated, isNew: false });
    }

    const created = await this.prisma.waitlistSignup.create({
      data: {
        email,
        whatsappPhone: body.whatsappPhone,
        source: body.source,
        utmSource: body.utmSource,
        utmMedium: body.utmMedium,
        utmCampaign: body.utmCampaign,
        willingToPay: body.willingToPay,
        message: body.message,
      },
      select: { id: true, email: true, createdAt: true },
    });
    this.logger.log(`Waitlist new signup: ${email} (source=${body.source || 'organic'})`);
    return successResponse({ ...created, isNew: true });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Estatísticas do waitlist (admin)' })
  async stats(@Query('days') daysRaw?: string) {
    const days = Math.max(1, Math.min(90, parseInt(daysRaw || '30', 10) || 30));
    const since = new Date(Date.now() - days * 86_400_000);

    const [total, last7d, lastDay, bySource, recent, willingPaying] = await Promise.all([
      this.prisma.waitlistSignup.count(),
      this.prisma.waitlistSignup.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
      this.prisma.waitlistSignup.count({ where: { createdAt: { gte: new Date(Date.now() - 86_400_000) } } }),
      this.prisma.waitlistSignup.groupBy({
        by: ['source'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.waitlistSignup.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          email: true,
          source: true,
          utmCampaign: true,
          willingToPay: true,
          message: true,
          createdAt: true,
        },
      }),
      this.prisma.waitlistSignup.aggregate({
        where: { willingToPay: { not: null } },
        _avg: { willingToPay: true },
        _count: { _all: true },
      }),
    ]);

    return successResponse({
      total,
      last7d,
      lastDay,
      bySource: bySource.map((s) => ({ source: s.source || 'organic', count: s._count._all })),
      recent,
      willingToPay: {
        avg: willingPaying._avg.willingToPay,
        respondents: willingPaying._count._all,
      },
    });
  }
}
