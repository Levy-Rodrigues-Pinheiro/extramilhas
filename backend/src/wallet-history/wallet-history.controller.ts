import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { WalletHistoryService } from './wallet-history.service';
import { PrismaService } from '../prisma/prisma.service';

class CreateFilterDto {
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  name!: string;
  @ApiPropertyOptional({ enum: ['ARBITRAGE', 'OFFERS', 'SIMULATOR'] })
  @IsOptional()
  @IsIn(['ARBITRAGE', 'OFFERS', 'SIMULATOR'])
  context?: string;
  @ApiProperty()
  @IsObject()
  filter!: Record<string, unknown>;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@ApiTags('Wallet History')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('wallet-history')
export class WalletHistoryController {
  constructor(
    private readonly svc: WalletHistoryService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Histórico de snapshots da carteira (default 90d)' })
  async getHistory(@CurrentUser() user: any, @Query('days') days?: string) {
    const d = days ? Math.min(365, parseInt(days, 10)) : 90;
    const result = await this.svc.getHistory(user.id, d);
    return successResponse(result);
  }

  @Post('snapshot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Captura snapshot agora (chamar manualmente não é idempotente/dia)' })
  async snapshot(@CurrentUser() user: any) {
    const result = await this.svc.captureSnapshot(user.id);
    return successResponse(result);
  }

  @Get('expiration-heatmap')
  @ApiOperation({ summary: 'Heatmap de pontos expirando nos próximos 24 meses' })
  async heatmap(@CurrentUser() user: any) {
    const result = await this.svc.getExpirationHeatmap(user.id);
    return successResponse(result);
  }

  // ─── Saved filters ─────────────────────────────────────────────────

  @Get('filters')
  @ApiOperation({ summary: 'Meus saved filters' })
  async listFilters(@CurrentUser() user: any, @Query('context') context?: string) {
    const filters = await (this.prisma as any).savedFilter.findMany({
      where: { userId: user.id, ...(context ? { context } : {}) },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return successResponse(
      filters.map((f: any) => ({
        ...f,
        filter: (() => {
          try {
            return JSON.parse(f.filterJson);
          } catch {
            return {};
          }
        })(),
      })),
    );
  }

  @Post('filters')
  @ApiOperation({ summary: 'Salva novo filter' })
  async createFilter(@CurrentUser() user: any, @Body() dto: CreateFilterDto) {
    // Se isDefault=true, desmarca os outros do mesmo context
    if (dto.isDefault) {
      await (this.prisma as any).savedFilter.updateMany({
        where: { userId: user.id, context: dto.context ?? 'ARBITRAGE' },
        data: { isDefault: false },
      });
    }
    const saved = await (this.prisma as any).savedFilter.create({
      data: {
        userId: user.id,
        name: dto.name,
        context: dto.context ?? 'ARBITRAGE',
        filterJson: JSON.stringify(dto.filter),
        isDefault: dto.isDefault ?? false,
      },
    });
    return successResponse(saved);
  }

  @Delete('filters/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove saved filter' })
  async deleteFilter(@CurrentUser() user: any, @Param('id') id: string) {
    await (this.prisma as any).savedFilter.deleteMany({
      where: { id, userId: user.id },
    });
    return successResponse({ deleted: true });
  }
}
