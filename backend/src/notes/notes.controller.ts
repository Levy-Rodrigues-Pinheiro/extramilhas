import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { NotesService } from './notes.service';

class CreateNoteDto {
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  title!: string;
  @ApiProperty()
  @IsString()
  @Length(1, 5000)
  body!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  remindAt?: string;
}

class UpdateNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;
  @ApiPropertyOptional()
  @IsOptional()
  remindAt?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

@ApiTags('Notes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('notes')
export class NotesController {
  constructor(private readonly svc: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista minhas notas (pinned no topo, updatedAt desc)' })
  async list(
    @CurrentUser() user: any,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const result = await this.svc.list(user.id, includeArchived === 'true');
    return successResponse(result);
  }

  @Post()
  @ApiOperation({ summary: 'Cria nota (opcional remindAt → push na data)' })
  async create(@CurrentUser() user: any, @Body() dto: CreateNoteDto) {
    const result = await this.svc.create(user.id, dto);
    return successResponse(result);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza nota (pin/archive/editar conteúdo/reminder)' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    const result = await this.svc.update(user.id, id, dto);
    return successResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove nota' })
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.delete(user.id, id);
    return successResponse(result);
  }
}
