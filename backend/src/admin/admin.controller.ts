import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubscriptionPlan, OfferType, OfferClassification } from '../common/enums';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUrl,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { CreateOfferDto } from './dto/create-offer.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

class UpdateUserPlanDto {
  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}

class CreateProgramDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ default: 25.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  avgCpmCurrent?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateArticleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isProOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  publishedAt?: Date;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard metrics' })
  async getDashboard() {
    const result = await this.adminService.getDashboardMetrics();
    return successResponse(result);
  }

  @Post('debug/throw')
  @HttpCode(500)
  @ApiOperation({ summary: 'Dispara erro proposital pra testar Sentry' })
  async debugThrow() {
    // Pega ref direto do Sentry e manda evento manual
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureException(new Error('ADMIN_DEBUG_THROW manual test'));
    } catch {}
    throw new Error('ADMIN_DEBUG_THROW: erro proposital pra validar Sentry');
  }

  @Get('debug/status')
  @ApiOperation({ summary: 'Status das integrações opcionais (Sentry/PostHog/Stripe/etc)' })
  async debugStatus() {
    return successResponse({
      sentry: !!process.env.SENTRY_DSN,
      posthog: !!process.env.POSTHOG_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      scheduler: process.env.SCHEDULER_ENABLED !== 'false' && process.env.NODE_ENV === 'production',
      nodeEnv: process.env.NODE_ENV,
    });
  }

  @Get('debug/snapshots')
  @ApiOperation({ summary: 'Últimos N snapshots de counts (canary de data loss)' })
  async debugSnapshots(@Query('limit') limitRaw?: string) {
    const limit = Math.min(90, parseInt(limitRaw || '30', 10) || 30);
    const snapshots = await this.adminService.listRecentSnapshots(limit);
    return successResponse({ count: snapshots.length, snapshots });
  }

  @Get('export/users.csv')
  @ApiOperation({ summary: 'Export CSV de users (análise externa)' })
  async exportUsersCsv(@Res() res: any) {
    const csv = await this.adminService.exportUsersCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }

  @Get('export/bonus-reports.csv')
  @ApiOperation({ summary: 'Export CSV de bonus reports' })
  async exportReportsCsv(@Res() res: any) {
    const csv = await this.adminService.exportBonusReportsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bonus-reports-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List users with filters and pagination' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'plan', required: false, enum: SubscriptionPlan })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUsers(
    @Query('search') search?: string,
    @Query('plan') plan?: SubscriptionPlan,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adminService.getUsers({
      search,
      plan,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return successResponse(result);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail' })
  async getUserById(@Param('id') id: string) {
    const result = await this.adminService.getUserById(id);
    return successResponse(result);
  }

  @Put('users/:id/plan')
  @ApiOperation({ summary: 'Update user subscription plan' })
  async updateUserPlan(@Param('id') id: string, @Body() body: UpdateUserPlanDto) {
    const result = await this.adminService.updateUserPlan(id, body.plan);
    return successResponse(result, 'User plan updated');
  }

  // ─── Offers ──────────────────────────────────────────────────────────────────

  @Get('offers')
  @ApiOperation({ summary: 'List offers with admin filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'programId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: OfferType })
  @ApiQuery({ name: 'classification', required: false, enum: OfferClassification })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getOffers(
    @Query('search') search?: string,
    @Query('programId') programId?: string,
    @Query('type') type?: string,
    @Query('classification') classification?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adminService.getOffers({
      search,
      programId,
      type,
      classification,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return successResponse(result);
  }

  @Post('offers')
  @ApiOperation({ summary: 'Create a new offer' })
  async createOffer(@Body() dto: CreateOfferDto) {
    const result = await this.adminService.createOffer(dto);
    return successResponse(result, 'Offer created');
  }

  @Put('offers/:id')
  @ApiOperation({ summary: 'Update an offer' })
  async updateOffer(@Param('id') id: string, @Body() dto: Partial<CreateOfferDto>) {
    const result = await this.adminService.updateOffer(id, dto);
    return successResponse(result, 'Offer updated');
  }

  @Delete('offers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an offer (isDeleted=true)' })
  async deleteOffer(@Param('id') id: string) {
    const result = await this.adminService.softDeleteOffer(id);
    return successResponse(result);
  }

  @Patch('offers/:id/toggle')
  @ApiOperation({ summary: 'Toggle offer isActive flag' })
  async toggleOffer(@Param('id') id: string) {
    const result = await this.adminService.toggleOfferActive(id);
    return successResponse(result);
  }

  // ─── Programs ────────────────────────────────────────────────────────────────

  @Get('programs')
  @ApiOperation({ summary: 'List all loyalty programs' })
  async getPrograms() {
    const result = await this.adminService.getPrograms();
    return successResponse(result);
  }

  @Post('programs')
  @ApiOperation({ summary: 'Create a loyalty program' })
  async createProgram(@Body() dto: CreateProgramDto) {
    const result = await this.adminService.createProgram(dto);
    return successResponse(result, 'Program created');
  }

  @Put('programs/:id')
  @ApiOperation({ summary: 'Update a loyalty program' })
  async updateProgram(@Param('id') id: string, @Body() dto: Partial<CreateProgramDto>) {
    const result = await this.adminService.updateProgram(id, dto as any);
    return successResponse(result, 'Program updated');
  }

  // ─── Articles ────────────────────────────────────────────────────────────────

  @Get('articles')
  @ApiOperation({ summary: 'List all articles (admin)' })
  async getArticles() {
    const result = await this.adminService.getArticles();
    return successResponse(result);
  }

  @Post('articles')
  @ApiOperation({ summary: 'Create an article' })
  async createArticle(@Body() dto: CreateArticleDto) {
    const result = await this.adminService.createArticle(dto);
    return successResponse(result, 'Article created');
  }

  @Put('articles/:id')
  @ApiOperation({ summary: 'Update an article' })
  async updateArticle(@Param('id') id: string, @Body() dto: Partial<CreateArticleDto>) {
    const result = await this.adminService.updateArticle(id, dto);
    return successResponse(result, 'Article updated');
  }

  @Delete('articles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an article' })
  async deleteArticle(@Param('id') id: string) {
    const result = await this.adminService.deleteArticle(id);
    return successResponse(result);
  }

  // ─── Award Charts ───────────────────────────────────────────────────────────

  @Get('award-charts')
  @ApiOperation({ summary: 'List award chart entries' })
  @ApiQuery({ name: 'programId', required: false })
  @ApiQuery({ name: 'origin', required: false })
  @ApiQuery({ name: 'destination', required: false })
  @ApiQuery({ name: 'cabinClass', required: false })
  async getAwardCharts(@Query() query: any) {
    const result = await this.adminService.getAwardCharts(query);
    return successResponse(result);
  }

  @Post('award-charts')
  @ApiOperation({ summary: 'Create an award chart entry' })
  async createAwardChart(@Body() body: any) {
    const result = await this.adminService.createAwardChart(body);
    return successResponse(result, 'Rota criada com sucesso');
  }

  @Put('award-charts/:id')
  @ApiOperation({ summary: 'Update an award chart entry' })
  async updateAwardChart(@Param('id') id: string, @Body() body: any) {
    const result = await this.adminService.updateAwardChart(id, body);
    return successResponse(result, 'Rota atualizada com sucesso');
  }

  @Delete('award-charts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an award chart entry' })
  async deleteAwardChart(@Param('id') id: string) {
    const result = await this.adminService.deleteAwardChart(id);
    return successResponse(result, 'Rota removida');
  }

  // ─── Notifications ───────────────────────────────────────────────────────────

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Broadcast push notification to users by plan' })
  async broadcastNotification(@Body() dto: BroadcastNotificationDto) {
    const result = await this.adminService.broadcastNotification(
      dto.title,
      dto.body,
      dto.targetPlan,
      dto.deepLink,
    );
    return successResponse(result);
  }
}
