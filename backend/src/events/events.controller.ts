import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { EventsService } from './events.service';

class RsvpDto {
  @ApiProperty({ enum: ['GOING', 'MAYBE', 'CANCELED'] })
  @IsIn(['GOING', 'MAYBE', 'CANCELED'])
  status!: string;
}

class CreateEventDto {
  @ApiProperty()
  @IsString()
  @Length(3, 200)
  title!: string;
  @ApiProperty()
  @IsString()
  @Length(10, 5000)
  description!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kind?: string;
  @ApiProperty()
  @IsDateString()
  startsAt!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;
  @ApiProperty()
  @IsString()
  location!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxAttendees?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  premiumOnly?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;
}

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly svc: EventsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista eventos públicos upcoming' })
  async list() {
    const result = await this.svc.listUpcoming();
    return successResponse(result);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhe do evento + meu RSVP' })
  async getDetail(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.getEventDetail(user.id, id);
    return successResponse(result);
  }

  @Post(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RSVP (GOING/MAYBE/CANCELED)' })
  async rsvp(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RsvpDto,
  ) {
    const result = await this.svc.rsvp(user.id, id, dto.status);
    return successResponse(result);
  }

  @Get('my/upcoming')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eventos futuros que marquei GOING/MAYBE' })
  async myUpcoming(@CurrentUser() user: any) {
    const result = await this.svc.myUpcomingRsvps(user.id);
    return successResponse(result);
  }

  // Admin
  @Post('admin/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin cria evento (draft)' })
  async create(@Body() dto: CreateEventDto) {
    const result = await this.svc.adminCreate(dto);
    return successResponse(result);
  }

  @Post('admin/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publica evento (isPublished=true)' })
  async publish(@Param('id') id: string) {
    const result = await this.svc.adminPublish(id);
    return successResponse(result);
  }
}
