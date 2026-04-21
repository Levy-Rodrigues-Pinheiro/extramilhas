import { Controller, Get, Header, HttpException, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { WalletPassService } from './wallet-pass.service';

@ApiTags('Wallet Pass')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('wallet-pass')
export class WalletPassController {
  constructor(private readonly svc: WalletPassService) {}

  @Get('json')
  @ApiOperation({ summary: 'Pass.json Apple Wallet (precisa ser signed externamente pra virar .pkpass)' })
  async json(@CurrentUser() user: any) {
    const result = await this.svc.generatePassJson(user.id);
    if (!result) throw new HttpException('User não encontrado', HttpStatus.NOT_FOUND);
    return successResponse(result);
  }

  @Get('html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Pass renderizado como HTML (fallback imprimível)' })
  async html(@CurrentUser() user: any, @Res() res: Response) {
    const html = await this.svc.generatePassHtml(user.id);
    if (!html) throw new HttpException('User não encontrado', HttpStatus.NOT_FOUND);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
