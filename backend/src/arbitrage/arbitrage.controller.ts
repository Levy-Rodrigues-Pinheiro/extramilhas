import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { ArbitrageService } from './arbitrage.service';

class CalculateTransferDto {
  @ApiProperty({ example: 'livelo', description: 'Slug do programa de origem' })
  @IsString()
  fromProgramSlug!: string;

  @ApiProperty({ example: 10000, description: 'Quantidade de pontos no programa origem' })
  @IsInt()
  @Min(100)
  @Max(10_000_000)
  points!: number;

  @ApiPropertyOptional({ example: 'smiles', description: 'Filtrar pra um destino específico (opcional)' })
  @IsOptional()
  @IsString()
  toProgramSlug?: string;
}

/**
 * Oportunidades de arbitragem — transferências com bônus, compras promocionais, etc.
 *
 * Endpoint é Public porque faz sentido mostrar ranking geral mesmo pra quem
 * não tá logado (incentivo a cadastrar). Se vier com JWT, personaliza com saldo.
 */
@ApiTags('Arbitrage')
@Controller('arbitrage')
export class ArbitrageController {
  constructor(private readonly arbitrage: ArbitrageService) {}

  @Public()
  @Post('calculate')
  @ApiOperation({
    summary: 'Calcula valor de transferir X pontos de um programa pra outros',
    description:
      'Resposta inclui ranking de TRANSFERIR / ESPERAR / NAO_TRANSFERIR ' +
      'com reasoning textual e exemplos de viagens possíveis com o resultado.',
  })
  @ApiBody({ type: CalculateTransferDto })
  async calculate(@Body() body: CalculateTransferDto) {
    try {
      const result = await this.arbitrage.calculateTransfer({
        fromProgramSlug: body.fromProgramSlug,
        points: body.points,
        toProgramSlug: body.toProgramSlug,
      });
      return successResponse(result);
    } catch (err: any) {
      throw new HttpException(err.message || 'Erro no cálculo', HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Get('transfer-bonuses')
  @ApiOperation({
    summary: 'Oportunidades de transferência com bônus ativo',
    description:
      'Lista ordenada de partnerships ativas. Se autenticado (Bearer token), ' +
      'personaliza com saldos do UserMilesBalance.',
  })
  async transferBonuses(@Req() req: any) {
    // JwtAuthGuard está como global-optional no app. Tenta extrair userId do token.
    const userId = req.user?.id || req.user?.userId || null;
    const data = await this.arbitrage.transferBonusOpportunities(userId);
    return successResponse({
      count: data.length,
      opportunities: data,
      isPersonalized: !!userId,
    });
  }
}
