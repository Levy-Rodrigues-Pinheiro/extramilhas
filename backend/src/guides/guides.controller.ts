import {
  Body,
  Controller,
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
import { IsArray, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { GuidesService } from './guides.service';

class CreateGuideDto {
  @ApiProperty()
  @IsString()
  @Length(5, 200)
  title!: string;

  @ApiProperty()
  @IsString()
  @Length(10, 280)
  summary!: string;

  @ApiProperty()
  @IsString()
  @Length(100, 50000)
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;
}

class UpdateGuideDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;
}

class RejectGuideDto {
  @ApiProperty()
  @IsString()
  @Length(10, 500)
  reason!: string;
}

@ApiTags('Guides')
@Controller('guides')
export class GuidesController {
  constructor(private readonly svc: GuidesService) {}

  // ─── Public listing + reading ──────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista guias publicados (SEO-friendly, ordenados por upvotes)' })
  async list(
    @Query('tag') tag?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.svc.listPublished({
      tag,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return successResponse(result);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Detalhe do guia por slug (incrementa viewCount)' })
  async getBySlug(@Param('slug') slug: string) {
    const result = await this.svc.getPublishedBySlug(slug);
    return successResponse(result);
  }

  @Get('my/list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista meus guias (todos os status)' })
  async myList(@CurrentUser() user: any) {
    const result = await this.svc.listMyGuides(user.id);
    return successResponse(result);
  }

  // ─── Author actions ─────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria draft' })
  async create(@CurrentUser() user: any, @Body() dto: CreateGuideDto) {
    const result = await this.svc.createDraft(user.id, dto);
    return successResponse(result);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza draft (só se status DRAFT ou REJECTED)' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateGuideDto,
  ) {
    const result = await this.svc.updateDraft(user.id, id, dto);
    return successResponse(result);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submete pra revisão (DRAFT → PENDING_REVIEW)' })
  async submit(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.submitForReview(user.id, id);
    return successResponse(result);
  }

  @Post(':id/upvote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle upvote (segunda chamada remove)' })
  async toggleUpvote(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.toggleUpvote(user.id, id);
    return successResponse(result);
  }

  // ─── Admin moderation ──────────────────────────────────────────────

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista guias pendentes de revisão' })
  async listPending() {
    const result = await this.svc.listPending();
    return successResponse(result);
  }

  @Post('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin aprova guia → PUBLISHED' })
  async approve(@CurrentUser() admin: any, @Param('id') id: string) {
    const result = await this.svc.approve(admin.id, id);
    return successResponse(result);
  }

  @Post('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin rejeita guia → REJECTED com motivo' })
  async reject(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: RejectGuideDto,
  ) {
    const result = await this.svc.reject(admin.id, id, dto.reason);
    return successResponse(result);
  }
}
