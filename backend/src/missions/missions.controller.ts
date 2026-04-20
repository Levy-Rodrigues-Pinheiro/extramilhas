import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { successResponse } from '../common/helpers/response.helper';
import { MissionsService } from './missions.service';

@ApiTags('Missions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('missions')
export class MissionsController {
  constructor(private missions: MissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Minhas missões com progresso calculado' })
  async list(@Req() req: any) {
    const userId = req.user?.id;
    const data = await this.missions.listForUser(userId);
    return successResponse(data);
  }

  @Post(':id/claim')
  @ApiOperation({ summary: 'Resgata recompensa de missão completada' })
  async claim(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    try {
      const result = await this.missions.claimReward(userId, id);
      return successResponse(result);
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}
