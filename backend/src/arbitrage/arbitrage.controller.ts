import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { ArbitrageService } from './arbitrage.service';

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
