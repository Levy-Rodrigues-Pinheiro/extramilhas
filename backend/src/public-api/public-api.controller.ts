import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional, ApiHeader } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { PublicApiService } from './public-api.service';

class CreateKeyDto {
  @ApiProperty()
  @IsString()
  @Length(3, 100)
  name!: string;
  @ApiPropertyOptional({ enum: ['free', 'starter', 'business'] })
  @IsOptional()
  @IsIn(['free', 'starter', 'business'])
  tier?: string;
}

/**
 * Endpoints do /api-keys — gerenciamento pelo owner (JWT).
 * Endpoints do /public — usam header `X-API-Key` pra autenticar.
 */
@ApiTags('Public API')
@Controller()
export class PublicApiController {
  constructor(private readonly svc: PublicApiService) {}

  // ─── Key management (JWT) ─────────────────────────────────────────

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria API key (retorna plaintext APENAS aqui)' })
  async createKey(@CurrentUser() user: any, @Body() dto: CreateKeyDto) {
    const result = await this.svc.createKey(user.id, dto.name, dto.tier ?? 'free');
    return successResponse(result);
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista minhas API keys (sem plaintext)' })
  async listMyKeys(@CurrentUser() user: any) {
    const result = await this.svc.listMine(user.id);
    return successResponse(result);
  }

  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoga API key (isActive=false)' })
  async revokeKey(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.revokeKey(user.id, id);
    return successResponse(result);
  }

  // ─── Public data endpoints (X-API-Key header) ────────────────────

  @Public()
  @Get('public/programs')
  @ApiHeader({ name: 'X-API-Key', required: true })
  @ApiOperation({ summary: 'Snapshot de programas + CPM atual (v1)' })
  async getPrograms(@Headers('x-api-key') apiKey: string) {
    if (!apiKey) throw new UnauthorizedException('X-API-Key header missing');
    await this.svc.validateAndUse(apiKey);
    const result = await this.svc.getProgramsSnapshot();
    return successResponse({ data: result, version: '1' });
  }

  @Public()
  @Get('public/bonuses')
  @ApiHeader({ name: 'X-API-Key', required: true })
  @ApiOperation({ summary: 'Bônus de transferência ativos (v1)' })
  async getBonuses(@Headers('x-api-key') apiKey: string) {
    if (!apiKey) throw new UnauthorizedException('X-API-Key header missing');
    await this.svc.validateAndUse(apiKey);
    const result = await this.svc.getActiveBonuses();
    return successResponse({ data: result, version: '1' });
  }

  @Public()
  @Get('public/programs/:slug/history')
  @ApiHeader({ name: 'X-API-Key', required: true })
  @ApiOperation({ summary: 'Histórico de CPM do programa (default 30d, ?days=90)' })
  async getHistory(
    @Headers('x-api-key') apiKey: string,
    @Param('slug') slug: string,
    @Query('days') days?: string,
  ) {
    if (!apiKey) throw new UnauthorizedException('X-API-Key header missing');
    await this.svc.validateAndUse(apiKey);
    const d = days ? Math.min(365, parseInt(days, 10)) : 30;
    const result = await this.svc.getProgramHistory(slug, d);
    return successResponse({ data: result, version: '1' });
  }
}
