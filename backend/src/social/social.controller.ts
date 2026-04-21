import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { SocialService } from './social.service';

class CreateGroupBuyDto {
  @ApiProperty()
  @IsString()
  programId!: string;
  @ApiProperty()
  @IsString()
  @Length(5, 200)
  title!: string;
  @ApiProperty()
  @IsString()
  @Length(10, 2000)
  description!: string;
  @ApiProperty()
  @IsInt()
  @Min(1000)
  targetPoints!: number;
  @ApiProperty()
  @IsDateString()
  deadline!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactMethod?: string;
  @ApiProperty()
  @IsString()
  contactValue!: string;
}

class JoinGroupBuyDto {
  @ApiProperty()
  @IsInt()
  @Min(1000)
  points!: number;
}

class CreateTripSwapDto {
  @ApiProperty()
  @IsString()
  @Length(5, 200)
  title!: string;
  @ApiProperty()
  @IsString()
  @Length(10, 2000)
  description!: string;
  @ApiProperty()
  @IsString()
  fromCity!: string;
  @ApiProperty()
  @IsDateString()
  fromDate!: string;
  @ApiProperty()
  @IsDateString()
  toDate!: string;
  @ApiProperty()
  @IsString()
  desiredInTrade!: string;
  @ApiProperty()
  @IsInt()
  estimatedValue!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactMethod?: string;
  @ApiProperty()
  @IsString()
  contactValue!: string;
}

class ExpressInterestDto {
  @ApiProperty()
  @IsString()
  @Length(10, 500)
  message!: string;
}

@ApiTags('Social')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('social')
export class SocialController {
  constructor(private readonly svc: SocialService) {}

  // ─── Group Buys ─────────────────────────────────────────────────────

  @Get('group-buys')
  @ApiOperation({ summary: 'Lista group buys abertos' })
  async listGroupBuys(
    @Query('programId') programId?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.svc.listGroupBuys({ programId, status });
    return successResponse(result);
  }

  @Get('group-buys/:id')
  @ApiOperation({ summary: 'Detalhe do group buy (contactValue só se participante/org)' })
  async getGroupBuy(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.getGroupBuyDetail(user.id, id);
    return successResponse(result);
  }

  @Post('group-buys')
  @ApiOperation({ summary: 'Cria group buy (user vira organizer)' })
  async createGroupBuy(@CurrentUser() user: any, @Body() dto: CreateGroupBuyDto) {
    const result = await this.svc.createGroupBuy(user.id, dto);
    return successResponse(result);
  }

  @Post('group-buys/:id/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Entra no group buy ou atualiza contribuição' })
  async joinGroupBuy(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: JoinGroupBuyDto,
  ) {
    const result = await this.svc.joinGroupBuy(user.id, id, dto.points);
    return successResponse(result);
  }

  @Post('group-buys/:id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sai do group buy' })
  async leaveGroupBuy(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.leaveGroupBuy(user.id, id);
    return successResponse(result);
  }

  // ─── Trip Swaps ─────────────────────────────────────────────────────

  @Get('trip-swaps')
  @ApiOperation({ summary: 'Lista trip swaps abertos' })
  async listTripSwaps(@Query('status') status?: string) {
    const result = await this.svc.listTripSwaps({ status });
    return successResponse(result);
  }

  @Get('trip-swaps/:id')
  @ApiOperation({ summary: 'Detalhe do trip swap (contactValue só se owner/interested)' })
  async getTripSwap(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.getTripSwapDetail(user.id, id);
    return successResponse(result);
  }

  @Post('trip-swaps')
  @ApiOperation({ summary: 'Cria trip swap' })
  async createTripSwap(@CurrentUser() user: any, @Body() dto: CreateTripSwapDto) {
    const result = await this.svc.createTripSwap(user.id, dto);
    return successResponse(result);
  }

  @Post('trip-swaps/:id/interest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Expressa interesse em trip swap (envia message pro owner)' })
  async expressInterest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ExpressInterestDto,
  ) {
    const result = await this.svc.expressInterest(user.id, id, dto.message);
    return successResponse(result);
  }
}
