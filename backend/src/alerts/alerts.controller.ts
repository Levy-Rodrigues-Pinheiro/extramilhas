import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { successResponse } from '../common/helpers/response.helper';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List my alerts' })
  async getAlerts(@CurrentUser() user: any) {
    const result = await this.alertsService.getAlerts(user.id);
    return successResponse(result);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new alert' })
  async createAlert(@CurrentUser() user: any, @Body() dto: CreateAlertDto) {
    const result = await this.alertsService.createAlert(
      user.id,
      dto,
      user.subscriptionPlan,
    );
    return successResponse(result, 'Alert created successfully');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an alert' })
  async updateAlert(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    const result = await this.alertsService.updateAlert(user.id, id, dto);
    return successResponse(result, 'Alert updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an alert' })
  async deleteAlert(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.alertsService.deleteAlert(user.id, id);
    return successResponse(result);
  }

  @Post('deactivate-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativa todos alertas do user (útil em férias)' })
  async deactivateAll(@CurrentUser() user: any) {
    const result = await this.alertsService.deactivateAll(user.id);
    return successResponse(result);
  }

  @Get('history')
  @ApiOperation({ summary: 'Alert trigger history with pagination' })
  async getAlertHistory(
    @CurrentUser() user: any,
    @Query() pagination: PaginationDto,
  ) {
    const result = await this.alertsService.getAlertHistory(user.id, pagination);
    return successResponse(result);
  }
}
