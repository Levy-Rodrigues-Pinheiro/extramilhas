import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { AchievementsService } from './achievements.service';

@ApiTags('Achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly svc: AchievementsService) {}

  @Public()
  @Get('catalog')
  @ApiOperation({ summary: 'Catálogo público de achievements (sem hidden)' })
  async catalog() {
    const result = await this.svc.listCatalog();
    return successResponse(result);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Meus achievements desbloqueados' })
  async mine(@CurrentUser() user: any) {
    const result = await this.svc.myUnlocked(user.id);
    return successResponse(result);
  }

  @Get('mine/with-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Catálogo completo com flag unlocked por item' })
  async mineWithStatus(@CurrentUser() user: any) {
    const result = await this.svc.myCatalogWithStatus(user.id);
    return successResponse(result);
  }
}
