import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { successResponse } from '../common/helpers/response.helper';
import { IntelAgentService } from './intel-agent.service';

class SourceDto {
  @IsString()
  name!: string;

  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  scopeSelector?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(10080)
  minIntervalMin?: number;
}

@ApiTags('IntelAgent')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller('admin/intel-agent')
export class IntelAgentController {
  constructor(private agent: IntelAgentService) {}

  @Get('sources')
  @ApiOperation({ summary: 'Lista fontes do agente' })
  async listSources() {
    const sources = await this.agent.listSources();
    return successResponse({ count: sources.length, sources });
  }

  @Post('sources')
  @ApiOperation({ summary: 'Cria nova fonte' })
  async createSource(@Body() body: SourceDto) {
    const source = await this.agent.upsertSource(body);
    return successResponse(source);
  }

  @Put('sources/:id')
  @ApiOperation({ summary: 'Atualiza fonte' })
  async updateSource(@Param('id') id: string, @Body() body: SourceDto) {
    const source = await this.agent.upsertSource({ ...body, id });
    return successResponse(source);
  }

  @Delete('sources/:id')
  @ApiOperation({ summary: 'Remove fonte' })
  async deleteSource(@Param('id') id: string) {
    const r = await this.agent.deleteSource(id);
    return successResponse(r);
  }

  @Post('run/:id')
  // Limita a 10 runs manuais/min — evita admin queimar $ em LLM por acidente.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Roda uma fonte específica agora (manual)' })
  async runOne(@Param('id') id: string) {
    try {
      const r = await this.agent.runOne(id);
      return successResponse(r);
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('run-all')
  // run-all custa $ por fonte × N. Teto 2/min previne loop acidental.
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @ApiOperation({ summary: 'Roda TODAS as fontes ativas agora (ignora minInterval)' })
  async runAll() {
    const r = await this.agent.runAll();
    return successResponse(r);
  }

  @Post('preview')
  // Preview consome 1 LLM call por teste. 20/min é farto mas bloqueia abuso.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Testa URL sem salvar — retorna o que o LLM extrai' })
  async preview(@Body() body: { url: string; sourceType?: string; scopeSelector?: string }) {
    if (!body?.url) throw new HttpException('url obrigatória', HttpStatus.BAD_REQUEST);
    try {
      const r = await this.agent.previewUrl({
        url: body.url,
        sourceType: body.sourceType || 'html',
        scopeSelector: body.scopeSelector,
      });
      return successResponse(r);
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Stats agregadas do agente (accuracy, custo, reports)' })
  async summary() {
    const s = await this.agent.getAgentSummary();
    return successResponse(s);
  }

  @Get('runs')
  @ApiOperation({ summary: 'Histórico recente de runs' })
  async recentRuns(@Query('limit') limit?: string) {
    const n = Math.min(200, parseInt(limit || '50', 10) || 50);
    const runs = await this.agent.listRecentRuns(n);
    return successResponse({ count: runs.length, runs });
  }
}
