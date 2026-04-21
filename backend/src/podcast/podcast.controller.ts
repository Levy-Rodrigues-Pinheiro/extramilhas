import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Length, Min } from 'class-validator';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard, Role } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { PodcastService } from './podcast.service';

class UpsertEpisodeDto {
  @ApiProperty()
  @IsString()
  @Length(3, 100)
  slug!: string;
  @ApiProperty()
  @IsString()
  @Length(3, 200)
  title!: string;
  @ApiProperty()
  @IsString()
  @Length(10, 5000)
  description!: string;
  @ApiProperty()
  @IsUrl()
  audioUrl!: string;
  @ApiProperty()
  @IsInt()
  @Min(1)
  durationSec!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  episodeNumber?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImage?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

@ApiTags('Podcast')
@Controller('podcast')
export class PodcastController {
  constructor(private readonly svc: PodcastService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista episódios publicados' })
  async list() {
    return successResponse(await this.svc.listPublished());
  }

  @Public()
  @Get('rss.xml')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  @ApiOperation({ summary: 'RSS feed pro Spotify/Apple Podcasts' })
  async rss(@Res() res: Response) {
    const xml = await this.svc.getRssFeed('https://milhasextras.com.br');
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(xml);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Episódio por slug (incrementa playCount)' })
  async getBySlug(@Param('slug') slug: string) {
    return successResponse(await this.svc.getBySlug(slug));
  }

  @Post('admin/upsert')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin upsert episódio' })
  async upsert(@Body() dto: UpsertEpisodeDto) {
    return successResponse(await this.svc.adminUpsert(dto));
  }
}
