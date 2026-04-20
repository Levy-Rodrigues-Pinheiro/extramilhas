import { Controller, Get, HttpException, HttpStatus, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { successResponse } from '../common/helpers/response.helper';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboard: LeaderboardService) {}

  @Public()
  @Get('reporters')
  @ApiOperation({ summary: 'Ranking público de reporters (top N por reports aprovados)' })
  async top(@Query('limit') limitRaw?: string) {
    const limit = Math.max(1, Math.min(100, parseInt(limitRaw || '20', 10) || 20));
    const reporters = await this.leaderboard.topReporters(limit);
    return successResponse({ count: reporters.length, reporters });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Meu tier + rank + meta pro próximo tier' })
  async me(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    const stats = await this.leaderboard.myStats(userId);
    return successResponse(stats);
  }
}
