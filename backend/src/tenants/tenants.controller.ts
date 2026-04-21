import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { TenantsService } from './tenants.service';

class CreateTenantDto {
  @ApiProperty()
  @IsString()
  @Length(3, 60)
  slug!: string;
  @ApiProperty()
  @IsString()
  @Length(2, 100)
  name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plan?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  userQuota?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactEmail?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;
}

@ApiTags('Tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly svc: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista tenants (admin)' })
  async list() {
    return successResponse(await this.svc.list());
  }

  @Post()
  @ApiOperation({ summary: 'Cria tenant' })
  async create(@Body() dto: CreateTenantDto) {
    return successResponse(await this.svc.create(dto));
  }

  @Put(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualiza tenant' })
  async update(@Param('slug') slug: string, @Body() dto: any) {
    return successResponse(await this.svc.update(slug, dto));
  }

  @Get(':slug/stats')
  @ApiOperation({ summary: 'Stats + user quota do tenant' })
  async stats(@Param('slug') slug: string) {
    return successResponse(await this.svc.stats(slug));
  }
}
