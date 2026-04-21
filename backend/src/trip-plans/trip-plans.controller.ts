import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Length, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { TripPlansService } from './trip-plans.service';

class CreateDto {
  @ApiProperty()
  @IsString()
  @Length(3, 200)
  title!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mainDestination?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  targetMiles?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  targetBrl?: number;
}

class AddItemDto {
  @ApiProperty({ enum: ['FLIGHT', 'HOTEL', 'ACTIVITY', 'NOTE'] })
  @IsIn(['FLIGHT', 'HOTEL', 'ACTIVITY', 'NOTE'])
  kind!: string;
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  title!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  milesCost?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  brlCost?: number;
}

@ApiTags('Trip Plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('trip-plans')
export class TripPlansController {
  constructor(private readonly svc: TripPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Minhas viagens (como owner ou member)' })
  async listMine(@CurrentUser() user: any) {
    const result = await this.svc.listMine(user.id);
    return successResponse(result);
  }

  @Post()
  @ApiOperation({ summary: 'Cria nova viagem' })
  async create(@CurrentUser() user: any, @Body() dto: CreateDto) {
    const result = await this.svc.create(user.id, dto);
    return successResponse(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da viagem + members + items + totals' })
  async getDetail(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.getDetail(user.id, id);
    return successResponse(result);
  }

  @Post('join/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Entra numa viagem via invite token' })
  async join(@CurrentUser() user: any, @Param('token') token: string) {
    const result = await this.svc.joinByToken(user.id, token);
    return successResponse(result);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Adiciona item ao roteiro (flight/hotel/activity/note)' })
  async addItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    const result = await this.svc.addItem(user.id, id, dto);
    return successResponse(result);
  }

  @Post(':id/items/:itemId/toggle-confirmed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle isConfirmed do item' })
  async toggleConfirmed(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const result = await this.svc.toggleItemConfirmed(user.id, id, itemId);
    return successResponse(result);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item do roteiro' })
  async deleteItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const result = await this.svc.deleteItem(user.id, id, itemId);
    return successResponse(result);
  }

  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Owner trava viagem (status=LOCKED, só leitura)' })
  async lock(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.lockTrip(user.id, id);
    return successResponse(result);
  }
}
