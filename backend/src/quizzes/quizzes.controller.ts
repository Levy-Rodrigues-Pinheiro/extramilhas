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
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { QuizzesService } from './quizzes.service';

class SubmitAttemptDto {
  @ApiProperty()
  @IsArray()
  answers!: Array<{ questionId: string; selectedId: string }>;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  timeSpentMs?: number;
}

@ApiTags('Quizzes')
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly svc: QuizzesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista quizzes publicados (sem correctIds)' })
  async list() {
    const result = await this.svc.listPublished();
    return successResponse(result);
  }

  @Get(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quiz pra fazer (sem correctIds)' })
  async getForTaking(@CurrentUser() user: any, @Param('slug') slug: string) {
    const result = await this.svc.getQuizForTaking(user.id, slug);
    return successResponse(result);
  }

  @Post(':slug/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submete respostas, recebe score + certificate se passar' })
  async submit(
    @CurrentUser() user: any,
    @Param('slug') slug: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    const result = await this.svc.submitAttempt(user.id, slug, dto);
    return successResponse(result);
  }

  @Get('certificates/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Meus certificados' })
  async myCertificates(@CurrentUser() user: any) {
    const result = await this.svc.myCertificates(user.id);
    return successResponse(result);
  }

  @Public()
  @Get('certificates/verify/:number')
  @ApiOperation({ summary: 'Verifica certificado por número (público, SEO-friendly)' })
  async verifyCert(@Param('number') certNumber: string) {
    const result = await this.svc.getCertificateByNumber(certNumber);
    return successResponse(result);
  }
}
