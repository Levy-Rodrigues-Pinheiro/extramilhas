import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { successResponse } from '../common/helpers/response.helper';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

class CreateBonusReportDto {
  @ApiProperty({ example: 'livelo' })
  @IsString()
  fromProgramSlug!: string;

  @ApiProperty({ example: 'smiles' })
  @IsString()
  toProgramSlug!: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  @Max(500)
  bonusPercent!: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'https://i.imgur.com/abc.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  screenshotUrl?: string;

  @ApiPropertyOptional({ example: 'Vi na newsletter da Livelo de hoje cedo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 'voce@email.com' })
  @IsOptional()
  @IsEmail()
  reporterEmail?: string;
}

class ReviewBonusReportDto {
  @ApiPropertyOptional({ example: 'Confirmado, ativo até 31/12' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;
}

/**
 * Crowdsourcing de bônus de transferência.
 *
 * Fluxo:
 * 1. Usuário viu bônus na newsletter/site → POST /bonus-reports (público,
 *    pode ser anônimo via reporterEmail)
 * 2. Admin recebe na fila → GET /admin/bonus-reports?status=PENDING
 * 3. Admin aprova → PUT /admin/bonus-reports/:id/approve →
 *    cria/atualiza TransferPartnership ativa
 * 4. Sistema notifica usuários (futuro: push)
 *
 * Throttle: 5 reports/hora por IP — evita spam mas permite uso real.
 */
@ApiTags('BonusReports')
@Controller()
export class BonusReportsController {
  private readonly logger = new Logger(BonusReportsController.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private push: PushService,
  ) {}

  private tryGetUserId(req: any): string | null {
    const auth = req.headers?.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try {
      const payload = this.jwtService.verify(auth.slice(7), {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return payload?.sub || payload?.id || null;
    } catch {
      return null;
    }
  }

  @Public()
  @Post('bonus-reports')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 3600_000 } })
  @ApiOperation({ summary: 'Reportar um bônus visto (público, pode ser anônimo)' })
  @ApiBody({ type: CreateBonusReportDto })
  async create(@Req() req: any, @Body() body: CreateBonusReportDto) {
    const reporterId = this.tryGetUserId(req);

    // Validar que programas existem
    const [fromProg, toProg] = await Promise.all([
      this.prisma.loyaltyProgram.findUnique({ where: { slug: body.fromProgramSlug } }),
      this.prisma.loyaltyProgram.findUnique({ where: { slug: body.toProgramSlug } }),
    ]);

    if (!fromProg || !toProg) {
      throw new HttpException('Programa origem ou destino inválido', HttpStatus.BAD_REQUEST);
    }
    if (fromProg.id === toProg.id) {
      throw new HttpException('Origem e destino não podem ser iguais', HttpStatus.BAD_REQUEST);
    }

    // Detecta duplicata recente (últimas 24h, mesmo par)
    const recent = await this.prisma.bonusReport.findFirst({
      where: {
        fromProgramSlug: body.fromProgramSlug,
        toProgramSlug: body.toProgramSlug,
        createdAt: { gte: new Date(Date.now() - 86400_000) },
        status: { in: ['PENDING', 'APPROVED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const status = recent ? 'DUPLICATE' : 'PENDING';

    const report = await this.prisma.bonusReport.create({
      data: {
        reporterId,
        reporterEmail: body.reporterEmail,
        fromProgramSlug: body.fromProgramSlug,
        toProgramSlug: body.toProgramSlug,
        bonusPercent: body.bonusPercent,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        screenshotUrl: body.screenshotUrl,
        notes: body.notes,
        status,
      },
      select: { id: true, status: true, createdAt: true },
    });

    this.logger.log(
      `Bonus report ${report.id}: ${body.fromProgramSlug}→${body.toProgramSlug} ${body.bonusPercent}% [${status}]`,
    );

    return successResponse({
      ...report,
      isDuplicate: status === 'DUPLICATE',
      message:
        status === 'DUPLICATE'
          ? 'Já tínhamos esse bônus! Obrigado mesmo assim.'
          : 'Recebido — vamos validar e avisar todo mundo.',
    });
  }

  @Public()
  @Get('bonus-reports/recent')
  @ApiOperation({ summary: 'Lista de bônus aprovados recentes (público)' })
  async listRecentApproved(@Query('days') daysRaw?: string) {
    const days = Math.max(1, Math.min(90, parseInt(daysRaw || '30', 10) || 30));
    const since = new Date(Date.now() - days * 86400_000);

    const reports = await this.prisma.bonusReport.findMany({
      where: { status: 'APPROVED', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        fromProgramSlug: true,
        toProgramSlug: true,
        bonusPercent: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return successResponse({ count: reports.length, reports });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('bonus-reports/mine')
  @ApiOperation({ summary: 'Lista de reports feitos pelo usuário autenticado' })
  async listMine(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const reports = await this.prisma.bonusReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return successResponse({
      count: reports.length,
      reports,
      stats: {
        pending: reports.filter((r) => r.status === 'PENDING').length,
        approved: reports.filter((r) => r.status === 'APPROVED').length,
        rejected: reports.filter((r) => r.status === 'REJECTED').length,
        duplicate: reports.filter((r) => r.status === 'DUPLICATE').length,
      },
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('admin/bonus-reports')
  @ApiOperation({ summary: 'Fila de reports pra revisão (admin)' })
  async listAdmin(@Query('status') status?: string) {
    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE'].includes(status)) {
      where.status = status;
    } else {
      where.status = 'PENDING'; // default
    }

    const reports = await this.prisma.bonusReport.findMany({
      where,
      orderBy: { createdAt: 'asc' }, // mais antigos primeiro (FIFO)
      take: 100,
      include: {
        reporter: { select: { id: true, email: true, name: true } },
      },
    });

    return successResponse({ count: reports.length, reports });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Put('admin/bonus-reports/:id/approve')
  @ApiOperation({ summary: 'Aprovar report → cria/atualiza TransferPartnership' })
  async approve(@Req() req: any, @Param('id') id: string, @Body() body: ReviewBonusReportDto) {
    const reviewerId = req.user?.id;
    const report = await this.prisma.bonusReport.findUnique({ where: { id } });
    if (!report) throw new HttpException('Report não encontrado', HttpStatus.NOT_FOUND);
    if (report.status !== 'PENDING') {
      throw new HttpException(`Report já está em status ${report.status}`, HttpStatus.BAD_REQUEST);
    }

    // Pega ou cria a TransferPartnership correspondente
    const [fromProg, toProg] = await Promise.all([
      this.prisma.loyaltyProgram.findUnique({ where: { slug: report.fromProgramSlug } }),
      this.prisma.loyaltyProgram.findUnique({ where: { slug: report.toProgramSlug } }),
    ]);
    if (!fromProg || !toProg) {
      throw new HttpException('Programa não existe mais', HttpStatus.BAD_REQUEST);
    }

    // Upsert da partnership (se já existe, atualiza bônus + expiração; senão cria)
    const existingPartnership = await this.prisma.transferPartnership.findFirst({
      where: { fromProgramId: fromProg.id, toProgramId: toProg.id },
    });

    let partnership;
    if (existingPartnership) {
      partnership = await this.prisma.transferPartnership.update({
        where: { id: existingPartnership.id },
        data: {
          currentBonus: report.bonusPercent,
          isActive: true,
          expiresAt: report.expiresAt,
        },
      });
    } else {
      partnership = await this.prisma.transferPartnership.create({
        data: {
          fromProgramId: fromProg.id,
          toProgramId: toProg.id,
          baseRate: 1.0,
          currentBonus: report.bonusPercent,
          isActive: true,
          expiresAt: report.expiresAt,
        },
      });
    }

    const updated = await this.prisma.bonusReport.update({
      where: { id },
      data: {
        status: 'APPROVED',
        adminNotes: body.adminNotes,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        partnershipId: partnership.id,
      },
    });

    this.logger.log(`Bonus report ${id} APPROVED by ${reviewerId}; partnership ${partnership.id}`);

    // Fire-and-forget: notifica TODOS os devices do novo bônus.
    // Falha de push não deve impedir a resposta admin.
    const bonusPct = Math.round(report.bonusPercent);
    this.push
      .broadcast({
        title: `🎁 ${bonusPct}% de bônus ${report.fromProgramSlug} → ${report.toProgramSlug}!`,
        body: 'Abre o app pra ver se vale a pena transferir seus pontos agora.',
        data: {
          type: 'bonus_approved',
          partnershipId: partnership.id,
          fromProgramSlug: report.fromProgramSlug,
          toProgramSlug: report.toProgramSlug,
          bonusPercent: report.bonusPercent,
          deepLink: '/arbitrage',
        },
      })
      .catch((err) => this.logger.error(`Push broadcast failed: ${err.message}`));

    return successResponse({ report: updated, partnership });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Put('admin/bonus-reports/:id/reject')
  @ApiOperation({ summary: 'Rejeitar report (com motivo)' })
  async reject(@Req() req: any, @Param('id') id: string, @Body() body: ReviewBonusReportDto) {
    const reviewerId = req.user?.id;
    const updated = await this.prisma.bonusReport.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNotes: body.adminNotes,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    });
    this.logger.log(`Bonus report ${id} REJECTED by ${reviewerId}`);
    return successResponse(updated);
  }
}
