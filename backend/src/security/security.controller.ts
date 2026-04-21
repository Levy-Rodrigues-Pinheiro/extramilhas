import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { SecurityService } from './security.service';

@ApiTags('Security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
@Controller('security')
export class SecurityController {
  constructor(private readonly svc: SecurityService) {}

  @Get('admin/stats')
  @ApiOperation({ summary: 'Dashboard de eventos de segurança (janela default 24h)' })
  async stats(@Query('hours') hours?: string) {
    const h = hours ? parseInt(hours, 10) : 24;
    const result = await this.svc.getAdminStats(h);
    return successResponse(result);
  }
}
