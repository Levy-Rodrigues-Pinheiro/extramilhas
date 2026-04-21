import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { ContactService } from './contact.service';

class CreateMessageDto {
  @ApiProperty()
  @IsString()
  @Length(2, 200)
  name!: string;
  @ApiProperty()
  @IsEmail()
  email!: string;
  @ApiPropertyOptional({ enum: ['GENERAL', 'PARTNERSHIP', 'PRESS', 'COMPLAINT', 'BUG'] })
  @IsOptional()
  @IsIn(['GENERAL', 'PARTNERSHIP', 'PRESS', 'COMPLAINT', 'BUG'])
  category?: string;
  @ApiProperty()
  @IsString()
  @Length(5, 200)
  subject!: string;
  @ApiProperty()
  @IsString()
  @Length(10, 10000)
  body!: string;
}

class UpdateMessageDto {
  @ApiPropertyOptional({ enum: ['NEW', 'READ', 'REPLIED', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['NEW', 'READ', 'REPLIED', 'ARCHIVED'])
  status?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly svc: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Envia mensagem pelo form público (rate limited 5/1h por email)' })
  async create(@Body() dto: CreateMessageDto) {
    const result = await this.svc.create(dto);
    return successResponse({ id: result.id, submitted: true });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista mensagens (admin, filtro ?status=NEW)' })
  async list(@Query('status') status?: string) {
    const result = await this.svc.adminList({ status });
    return successResponse(result);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualiza status + notes internas' })
  async update(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    const result = await this.svc.adminUpdate(id, admin.id, dto);
    return successResponse(result);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Counts por status' })
  async stats() {
    const result = await this.svc.adminStats();
    return successResponse(result);
  }
}
