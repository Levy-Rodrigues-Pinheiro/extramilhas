import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional, ApiBearerAuth } from '@nestjs/swagger';
import { IsArray, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { NewsletterService } from './newsletter.service';

class SubscribeDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
  @ApiPropertyOptional({ enum: ['LANDING', 'BLOG', 'PROFILE', 'WAITLIST', 'OTHER'] })
  @IsOptional()
  @IsIn(['LANDING', 'BLOG', 'PROFILE', 'WAITLIST', 'OTHER'])
  source?: string;
  @ApiPropertyOptional({ enum: ['WEEKLY_DIGEST', 'MONTHLY', 'IMPORTANT_ONLY'] })
  @IsOptional()
  @IsIn(['WEEKLY_DIGEST', 'MONTHLY', 'IMPORTANT_ONLY'])
  frequency?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags?: string[];
}

@ApiTags('Newsletter')
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly svc: NewsletterService) {}

  @Public()
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inscreve email (double opt-in se email service ativo)' })
  async subscribe(@Body() dto: SubscribeDto) {
    const result = await this.svc.subscribe(dto);
    return successResponse({ subscribed: true, id: result.id });
  }

  @Public()
  @Get('confirm/:token')
  @ApiOperation({ summary: 'Confirma subscription via token (email link)' })
  async confirm(@Param('token') token: string) {
    const result = await this.svc.confirm(token);
    return successResponse({ confirmed: true, email: result.email });
  }

  @Public()
  @Get('unsubscribe/:token')
  @ApiOperation({ summary: 'Opt-out via token (email footer link)' })
  async unsubscribe(@Param('token') token: string) {
    const result = await this.svc.unsubscribe(token);
    return successResponse(result);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stats de newsletter (admin)' })
  async adminStats() {
    const result = await this.svc.adminStats();
    return successResponse(result);
  }
}
