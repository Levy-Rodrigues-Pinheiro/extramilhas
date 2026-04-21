import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { CreditCardsService } from './credit-cards.service';

class RecommendDto {
  @ApiProperty({ description: 'Gasto médio mensal em R$' })
  @IsInt()
  @Min(100)
  monthlySpendBrl!: number;

  @ApiPropertyOptional({ description: 'Renda mensal em R$ (filtra elegibilidade)' })
  @IsOptional()
  @IsInt()
  monthlyIncomeBrl?: number;

  @ApiPropertyOptional({
    description: 'Split de % por categoria (ex: {"restaurante": 0.3, "viagem": 0.2})',
  })
  @IsOptional()
  @IsObject()
  categories?: Record<string, number>;
}

@ApiTags('Credit Cards')
@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly svc: CreditCardsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Catálogo público de cartões' })
  async list() {
    const result = await this.svc.listAll();
    return successResponse(result);
  }

  @Post('recommend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recommender: top 5 cartões por ROI pro perfil' })
  async recommend(@Body() dto: RecommendDto) {
    const result = await this.svc.recommend({
      monthlySpendBrl: dto.monthlySpendBrl,
      monthlyIncomeBrl: dto.monthlyIncomeBrl,
      categories: dto.categories,
    });
    return successResponse(result);
  }

  @Post('compare')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Compara 2 cartões lado a lado (cartão atual vs novo)' })
  async compare(
    @Body()
    dto: {
      currentCardId: string;
      newCardId: string;
      monthlySpendBrl: number;
      categories?: Record<string, number>;
    },
  ) {
    const result = await this.svc.compareCards(dto);
    return successResponse(result);
  }
}
