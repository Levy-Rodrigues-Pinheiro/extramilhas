import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { successResponse } from '../common/helpers/response.helper';
import { ReferralService } from './referral.service';

class ApplyCodeDto {
  @IsString()
  @Length(6, 12)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Código deve ser letras maiúsculas/números',
  })
  code!: string;
}

@ApiTags('Referral')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('referral')
export class ReferralController {
  constructor(private referral: ReferralService) {}

  @Get('me')
  @ApiOperation({ summary: 'Meu código + stats de referrals' })
  async me(@Req() req: any) {
    const userId = req.user?.id;
    const stats = await this.referral.getStats(userId);
    return successResponse(stats);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Aplica código de referral (só primeiros 7d)' })
  async apply(@Req() req: any, @Body() body: ApplyCodeDto) {
    const userId = req.user?.id;
    try {
      await this.referral.applyCode(userId, body.code.toUpperCase());
      return successResponse({
        applied: true,
        message: '🎉 Código aplicado! Você e quem te indicou ganharam 30 dias Premium.',
      });
    } catch (err: any) {
      throw new HttpException(err.message || 'Falha', HttpStatus.BAD_REQUEST);
    }
  }
}
