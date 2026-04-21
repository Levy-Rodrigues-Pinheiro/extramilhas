import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { CommunityService } from './community.service';

class CreateThreadDto {
  @ApiProperty()
  @IsString()
  @Length(3, 200)
  title!: string;

  @ApiProperty()
  @IsString()
  @Length(10, 5000)
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;
}

class CreatePostDto {
  @ApiProperty()
  @IsString()
  @Length(1, 5000)
  body!: string;
}

class VoteDto {
  @ApiProperty()
  @IsString()
  optionId!: string;
}

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(private readonly svc: CommunityService) {}

  // ─── Forum ──────────────────────────────────────────────────────────

  @Get('threads')
  @ApiOperation({ summary: 'Lista threads do fórum (ordem: recentes primeiro)' })
  async listThreads(
    @Query('tag') tag?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.svc.listThreads({
      tag,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return successResponse(result);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Detalhe da thread com posts' })
  async getThread(@Param('id') id: string) {
    const result = await this.svc.getThread(id);
    return successResponse(result);
  }

  @Post('threads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria nova thread' })
  async createThread(@CurrentUser() user: any, @Body() dto: CreateThreadDto) {
    const result = await this.svc.createThread(user.id, dto);
    return successResponse(result);
  }

  @Post('threads/:id/posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Posta uma resposta numa thread' })
  async createPost(
    @CurrentUser() user: any,
    @Param('id') threadId: string,
    @Body() dto: CreatePostDto,
  ) {
    const result = await this.svc.createPost(user.id, threadId, dto.body);
    return successResponse(result);
  }

  @Delete('threads/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autor oculta sua própria thread (soft delete)' })
  async deleteOwnThread(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.deleteOwnThread(user.id, id);
    return successResponse(result);
  }

  // ─── Polls ──────────────────────────────────────────────────────────

  @Get('polls')
  @ApiOperation({ summary: 'Lista enquetes ativas (com contagem de votos)' })
  async listPolls() {
    const result = await this.svc.listActivePolls();
    return successResponse(result);
  }

  @Post('polls/:id/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vota (upsert — pode mudar voto)' })
  async vote(
    @CurrentUser() user: any,
    @Param('id') pollId: string,
    @Body() dto: VoteDto,
  ) {
    const result = await this.svc.vote(user.id, pollId, dto.optionId);
    return successResponse(result);
  }

  @Get('polls/:id/my-vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna optionId que o user votou (null se não votou)' })
  async myVote(@CurrentUser() user: any, @Param('id') pollId: string) {
    const result = await this.svc.myVote(user.id, pollId);
    return successResponse({ optionId: result });
  }
}
