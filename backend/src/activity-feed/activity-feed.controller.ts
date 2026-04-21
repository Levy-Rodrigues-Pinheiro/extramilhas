import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { ActivityFeedService } from './activity-feed.service';

class SetBadgesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  badges!: string[];
}

@ApiTags('Activity Feed')
@Controller('activity')
export class ActivityFeedController {
  constructor(private readonly svc: ActivityFeedService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Feed público (últimas 50 activities de users opt-in)' })
  async publicFeed(@Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 50;
    const result = await this.svc.getPublicFeed(l);
    return successResponse(result);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Minha timeline pessoal' })
  async myFeed(@CurrentUser() user: any, @Query('limit') limit?: string) {
    const l = limit ? parseInt(limit, 10) : 50;
    const result = await this.svc.getMyFeed(user.id, l);
    return successResponse(result);
  }

  @Post('admin/users/:id/badges')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin seta badges: VERIFIED/CREATOR/STAFF/EARLY_ADOPTER/TOP_REPORTER' })
  async setBadges(
    @CurrentUser() admin: any,
    @Param('id') targetUserId: string,
    @Body() dto: SetBadgesDto,
  ) {
    const result = await this.svc.setBadges(admin.id, targetUserId, dto.badges);
    return successResponse(result);
  }
}
