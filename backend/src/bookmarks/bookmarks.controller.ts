import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { BookmarksService } from './bookmarks.service';

class ToggleDto {
  @ApiProperty({ enum: ['PROGRAM', 'DESTINATION', 'BONUS', 'GUIDE', 'OFFER'] })
  @IsString()
  kind!: string;
  @ApiProperty()
  @IsString()
  targetId!: string;
  @ApiProperty()
  @IsString()
  @Length(1, 200)
  label!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('Bookmarks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly svc: BookmarksService) {}

  @Get()
  @ApiOperation({ summary: 'Lista meus bookmarks (filtrável por ?kind)' })
  async list(@CurrentUser() user: any, @Query('kind') kind?: string) {
    const result = await this.svc.list(user.id, kind);
    return successResponse(result);
  }

  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle bookmark (idempotent)' })
  async toggle(@CurrentUser() user: any, @Body() dto: ToggleDto) {
    const result = await this.svc.toggle(user.id, dto.kind, dto.targetId, dto.label, dto.note);
    return successResponse(result);
  }
}
