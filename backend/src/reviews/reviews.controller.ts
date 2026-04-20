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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { ReviewsService } from './reviews.service';

class UpsertReviewDto {
  @ApiProperty({ description: 'Funcionou? true = sim, false = não' })
  @IsBoolean()
  worked!: boolean;

  @ApiPropertyOptional({ description: 'Comentário opcional (max 500)' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  comment?: string;
}

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  /** Público — mostra agregado (worked/notWorked) na tela de ofertas */
  @Get('partnership/:id/summary')
  @ApiOperation({ summary: 'Resumo de reviews de uma partnership' })
  async getSummary(@Param('id') partnershipId: string, @Query('userId') userId?: string) {
    const result = await this.reviews.getSummary(partnershipId, userId);
    return successResponse(result);
  }

  @Post('partnership/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert review (funcionou/não funcionou)' })
  async upsert(
    @CurrentUser() user: any,
    @Param('id') partnershipId: string,
    @Body() body: UpsertReviewDto,
  ) {
    const result = await this.reviews.upsert(user.id, partnershipId, body.worked, body.comment);
    return successResponse(result);
  }

  @Delete('partnership/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove sua review' })
  async remove(@CurrentUser() user: any, @Param('id') partnershipId: string) {
    const result = await this.reviews.deleteReview(user.id, partnershipId);
    return successResponse(result);
  }
}
