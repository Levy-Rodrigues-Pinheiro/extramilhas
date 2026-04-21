import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, IsIn, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { FeatureFlagsService } from './feature-flags.service';

class UpsertFlagDto {
  @IsString()
  key!: string;
  @IsString()
  description!: string;
  @IsIn(['off', 'on', 'rollout'])
  mode!: string;
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number;
  @IsOptional()
  @IsArray()
  allowlist?: string[];
}

class UpsertExperimentDto {
  @IsString()
  key!: string;
  @IsString()
  description!: string;
  @IsArray()
  variants!: Array<{ name: string; weight: number }>;
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly ff: FeatureFlagsService) {}

  /** Mobile chama 1x no boot → recebe todas flags+variantes resolvidas pro user */
  @Get('resolve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve flags + variantes pro user atual (chamar no boot)' })
  async resolve(@CurrentUser() user: any) {
    const result = await this.ff.resolveForUser(user.id);
    return successResponse(result);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista todas flags e experimentos (admin)' })
  async listAll() {
    const result = await this.ff.listAll();
    return successResponse(result);
  }

  @Put('admin/flag')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert flag' })
  async upsertFlag(@Body() dto: UpsertFlagDto) {
    const result = await this.ff.upsertFlag(dto);
    return successResponse(result);
  }

  @Put('admin/experiment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert experimento' })
  async upsertExperiment(@Body() dto: UpsertExperimentDto) {
    const result = await this.ff.upsertExperiment(dto);
    return successResponse(result);
  }
}
