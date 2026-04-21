import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { SloService } from './slo.service';

@ApiTags('SLO')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
@Controller('slo')
export class SloController {
  constructor(private readonly svc: SloService) {}

  @Get('status')
  @ApiOperation({ summary: 'SLO status + error budget burn rate (janela default 30d)' })
  async status(@Query('hours') hours?: string) {
    const h = hours ? parseInt(hours, 10) : 720;
    const result = await this.svc.getStatus(h);
    return successResponse(result);
  }
}
