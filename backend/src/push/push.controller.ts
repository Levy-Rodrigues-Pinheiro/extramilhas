import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiProperty, ApiPropertyOptional, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { successResponse } from '../common/helpers/response.helper';
import { PushService } from './push.service';

class RegisterDeviceDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxx]' })
  @IsString()
  @MaxLength(300)
  token!: string;

  @ApiProperty({ example: 'android', enum: ['android', 'ios', 'web'] })
  @IsIn(['android', 'ios', 'web'])
  platform!: 'android' | 'ios' | 'web';

  @ApiPropertyOptional({ example: '1.0.1' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;
}

class UnregisterDeviceDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxx]' })
  @IsString()
  token!: string;
}

@ApiTags('Push')
@Controller()
export class PushController {
  private readonly logger = new Logger(PushController.name);

  constructor(
    private push: PushService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // Extrai userId manualmente (endpoint Public mas queremos associar se logado)
  private tryGetUserId(req: any): string | null {
    const auth = req.headers?.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    try {
      const payload = this.jwtService.verify(auth.slice(7), {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return payload?.sub || payload?.id || null;
    } catch {
      return null;
    }
  }

  @Public()
  @Post('devices/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registra device token pra push (associa ao user se logado)' })
  @ApiBody({ type: RegisterDeviceDto })
  async register(@Req() req: any, @Body() body: RegisterDeviceDto) {
    const userId = this.tryGetUserId(req);
    try {
      const device = await this.push.registerToken({
        token: body.token,
        userId,
        platform: body.platform,
        appVersion: body.appVersion,
      });
      this.logger.log(
        `Device registered: ${body.platform} ${device.id} (user=${userId || 'anon'})`,
      );
      return successResponse({ id: device.id, userId: device.userId });
    } catch (err) {
      throw new HttpException((err as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Delete('devices/unregister')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove token (logout, desinstalação, troca de device)' })
  @ApiBody({ type: UnregisterDeviceDto })
  async unregister(@Body() body: UnregisterDeviceDto) {
    await this.push.unregisterToken(body.token);
    return successResponse({ unregistered: true });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Get('admin/devices/stats')
  @ApiOperation({ summary: 'Stats de tokens ativos (admin)' })
  async stats() {
    const s = await this.push.getStats();
    return successResponse(s);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('admin/push/broadcast')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Broadcast manual (admin) — útil pra testar' })
  async broadcast(@Body() body: { title: string; body: string; data?: any }) {
    if (!body?.title || !body?.body) {
      throw new HttpException('title e body obrigatórios', HttpStatus.BAD_REQUEST);
    }
    const result = await this.push.broadcast({
      title: body.title,
      body: body.body,
      data: body.data,
    });
    return successResponse(result);
  }
}
