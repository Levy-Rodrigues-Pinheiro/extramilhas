import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { EngagementService } from './engagement.service';

class CreateGoalDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  targetMiles!: number;

  @ApiProperty({ description: 'ISO date yyyy-mm-dd' })
  @IsDateString()
  targetDate!: string;
}

@ApiTags('Engagement')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('engagement')
export class EngagementController {
  constructor(private readonly eng: EngagementService) {}

  // ─── Streaks ────────────────────────────────────────────────────────

  @Get('streak')
  @ApiOperation({ summary: 'Estado atual do streak do user' })
  async getStreak(@CurrentUser() user: any) {
    const result = await this.eng.getStreak(user.id);
    return successResponse(result);
  }

  @Get('streak/milestones')
  @ApiOperation({ summary: 'Lista milestones com dias + Premium grátis a ganhar' })
  async getMilestones(@CurrentUser() user: any) {
    const streak = await this.eng.getStreak(user.id);
    // Hardcoded aqui pra dar visibility pro frontend; matches STREAK_REWARDS do service
    const milestones = [
      { days: 7, premiumDays: 1 },
      { days: 30, premiumDays: 7 },
      { days: 100, premiumDays: 30 },
      { days: 365, premiumDays: 90 },
    ];
    let claimed: number[] = [];
    try {
      claimed = JSON.parse((streak as any).milestonesClaimed ?? '[]');
    } catch {
      /* ignore */
    }
    return successResponse({
      currentStreak: streak.currentStreak,
      milestones: milestones.map((m) => ({
        ...m,
        achieved: streak.currentStreak >= m.days,
        claimed: claimed.includes(m.days),
      })),
    });
  }

  @Post('streak/ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registra visita do dia (incrementa streak se novo dia)' })
  async ping(@CurrentUser() user: any) {
    const result = await this.eng.ping(user.id);
    return successResponse(result);
  }

  // ─── Goals ──────────────────────────────────────────────────────────

  @Get('goals')
  @ApiOperation({ summary: 'Lista metas do user com progresso calculado' })
  async listGoals(
    @CurrentUser() user: any,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const result = await this.eng.listGoals(user.id, includeArchived === 'true');
    return successResponse(result);
  }

  @Post('goals')
  @ApiOperation({ summary: 'Cria nova meta' })
  async createGoal(@CurrentUser() user: any, @Body() dto: CreateGoalDto) {
    const result = await this.eng.createGoal(user.id, {
      title: dto.title,
      programId: dto.programId,
      targetMiles: dto.targetMiles,
      targetDate: dto.targetDate,
    });
    return successResponse(result);
  }

  @Post('goals/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Arquiva uma meta (não apaga)' })
  async archiveGoal(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.eng.archiveGoal(user.id, id);
    return successResponse(result);
  }

  @Delete('goals/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deleta uma meta' })
  async deleteGoal(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.eng.deleteGoal(user.id, id);
    return successResponse(result);
  }
}
