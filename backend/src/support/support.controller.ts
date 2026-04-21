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
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { SupportService } from './support.service';

class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @Length(5, 200)
  subject!: string;

  @ApiPropertyOptional({ enum: ['GENERAL', 'BILLING', 'BUG', 'FEATURE', 'ACCOUNT'] })
  @IsOptional()
  @IsIn(['GENERAL', 'BILLING', 'BUG', 'FEATURE', 'ACCOUNT'])
  category?: string;

  @ApiProperty()
  @IsString()
  @Length(10, 5000)
  body!: string;
}

class PostMessageDto {
  @ApiProperty()
  @IsString()
  @Length(1, 5000)
  body!: string;
}

class SetPriorityDto {
  @ApiProperty({ enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] })
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority!: string;
}

@ApiTags('Support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly svc: SupportService) {}

  // ─── User side ──────────────────────────────────────────────────────

  @Get('tickets')
  @ApiOperation({ summary: 'Meus tickets (últimos 50)' })
  async listMine(@CurrentUser() user: any) {
    const result = await this.svc.listMyTickets(user.id);
    return successResponse(result);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Abre novo ticket' })
  async create(@CurrentUser() user: any, @Body() dto: CreateTicketDto) {
    const result = await this.svc.createTicket(user.id, {
      subject: dto.subject,
      category: dto.category ?? 'GENERAL',
      body: dto.body,
    });
    return successResponse(result);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Detalhe de um ticket (com mensagens públicas)' })
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.getTicket(user.id, id, user.isAdmin);
    return successResponse(result);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Posta resposta no ticket' })
  async postMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: PostMessageDto,
  ) {
    const result = await this.svc.postMessage(user.id, id, dto.body, user.isAdmin === true);
    return successResponse(result);
  }

  @Post('tickets/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fecha ticket (user ou admin)' })
  async close(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.closeTicket(user.id, id, user.isAdmin === true);
    return successResponse(result);
  }

  // ─── Admin side ─────────────────────────────────────────────────────

  @Get('admin/queue')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Fila completa de tickets (ordenada por prioridade + idade)' })
  async adminQueue(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: string,
  ) {
    const result = await this.svc.adminListTickets({ status, priority, assignedTo });
    return successResponse(result);
  }

  @Post('admin/tickets/:id/assign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin pega o ticket pra si (assignedTo = me)' })
  async adminAssign(@CurrentUser() admin: any, @Param('id') id: string) {
    const result = await this.svc.adminAssignTicket(admin.id, id);
    return successResponse(result);
  }

  @Post('admin/tickets/:id/priority')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin muda prioridade' })
  async adminPriority(@Param('id') id: string, @Body() dto: SetPriorityDto) {
    const result = await this.svc.adminSetPriority(id, dto.priority);
    return successResponse(result);
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Stats da central (counts por status)' })
  async adminStats() {
    const result = await this.svc.adminGetStats();
    return successResponse(result);
  }
}
