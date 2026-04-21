import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { EmailTemplatesService } from './email-templates.service';

class UpsertDto {
  @ApiProperty()
  @IsString()
  @Length(3, 100)
  slug!: string;
  @ApiProperty()
  @IsString()
  @Length(3, 200)
  subject!: string;
  @ApiProperty()
  @IsString()
  body!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyText?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Email Templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly svc: EmailTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista templates (admin)' })
  async list() {
    const result = await this.svc.list();
    return successResponse(result);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Template por slug' })
  async getBySlug(@Param('slug') slug: string) {
    const result = await this.svc.getBySlug(slug);
    return successResponse(result);
  }

  @Get(':slug/preview')
  @ApiOperation({ summary: 'Preview renderizado com vars fake + missingPlaceholders' })
  async preview(@Param('slug') slug: string) {
    const result = await this.svc.previewBySlug(slug);
    return successResponse(result);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert template' })
  async upsert(@Body() dto: UpsertDto) {
    const result = await this.svc.upsert(dto);
    return successResponse(result);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete template' })
  async delete(@Param('slug') slug: string) {
    const result = await this.svc.delete(slug);
    return successResponse(result);
  }
}
