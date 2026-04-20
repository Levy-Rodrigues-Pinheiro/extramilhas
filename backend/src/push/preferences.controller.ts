import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { successResponse } from '../common/helpers/response.helper';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';

class UpdatePrefsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notifyBonus?: boolean;

  @ApiPropertyOptional({
    example: ['livelo:smiles', 'esfera:smiles'],
    description: 'Pares "from:to"; vazio = todos',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  notifyProgramPairs?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  notifyWhatsApp?: boolean;
}

class StartVerifyDto {
  @ApiProperty({ example: '+5511999999999 ou (11) 99999-9999' })
  @IsString()
  @MaxLength(20)
  phone!: string;
}

class ConfirmVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

/**
 * Preferências de notificação + fluxo de verificação do WhatsApp.
 *
 * Todas as rotas são auth-required (user precisa estar logado pra ter prefs).
 *
 * Fluxo de verificação WhatsApp:
 *  1. POST /notifications/verify-start { phone } → manda SMS com código
 *     e guarda hash+expiry em memória (ou Notification table no futuro)
 *  2. POST /notifications/verify-confirm { code } → valida código,
 *     marca whatsappVerifiedAt e persiste phone
 *
 * Códigos ficam em memória (Map) por 10min. Em produção com múltiplas
 * instâncias, mover pra Redis/DB.
 */
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('notifications')
export class NotificationPreferencesController {
  private readonly logger = new Logger(NotificationPreferencesController.name);

  // phone:userId → {code, expiresAt}
  private readonly pendingCodes = new Map<
    string,
    { code: string; expiresAt: number; phone: string }
  >();

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsAppService,
  ) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Minhas preferências de notificação' })
  async get(@Req() req: any) {
    const userId = req.user?.id;
    // `as any` porque os campos novos (notifyBonus etc.) estão no schema
    // e no DB, mas o Prisma Client local está travado num dev-server antigo —
    // no build de produção (Fly) o generate roda fresh e tipa certo.
    const prefs = (await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId } as any,
      update: {},
    })) as any;
    const whatsappVerified = !!prefs.whatsappVerifiedAt;
    let notifyPairs: string[] = [];
    try {
      notifyPairs = JSON.parse(prefs.notifyProgramPairs || '[]');
    } catch {
      notifyPairs = [];
    }
    return successResponse({
      notifyBonus: prefs.notifyBonus ?? true,
      notifyProgramPairs: notifyPairs,
      notifyWhatsApp: prefs.notifyWhatsApp ?? false,
      whatsappVerified,
    });
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Atualiza preferências' })
  @ApiBody({ type: UpdatePrefsDto })
  async update(@Req() req: any, @Body() body: UpdatePrefsDto) {
    const userId = req.user?.id;

    // Se tenta ativar WhatsApp sem verificar → bloqueia
    if (body.notifyWhatsApp === true) {
      const existing = (await this.prisma.userPreference.findUnique({
        where: { userId },
      })) as any;
      if (!existing?.whatsappVerifiedAt) {
        throw new HttpException(
          'Verifique seu WhatsApp antes de ativar esse canal',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const data: any = {};
    if (typeof body.notifyBonus === 'boolean') data.notifyBonus = body.notifyBonus;
    if (typeof body.notifyWhatsApp === 'boolean') data.notifyWhatsApp = body.notifyWhatsApp;
    if (Array.isArray(body.notifyProgramPairs)) {
      const sanitized = body.notifyProgramPairs.filter(
        (s) => typeof s === 'string' && /^[a-z]+:[a-z]+$/.test(s),
      );
      data.notifyProgramPairs = JSON.stringify(sanitized);
    }

    const updated = await this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...data } as any,
      update: data as any,
    });
    return successResponse({ updated: true, prefs: updated });
  }

  @Post('verify-start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia verificação WhatsApp (envia SMS com código)' })
  @ApiBody({ type: StartVerifyDto })
  async verifyStart(@Req() req: any, @Body() body: StartVerifyDto) {
    const userId = req.user?.id;
    const phoneE164 = this.whatsapp.normalizePhone(body.phone);
    if (!phoneE164) {
      throw new HttpException('Número inválido', HttpStatus.BAD_REQUEST);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10min
    this.pendingCodes.set(userId, { code, expiresAt, phone: phoneE164 });

    const sent = await this.whatsapp.sendVerificationCode(phoneE164, code);
    if (!sent) {
      throw new HttpException('Falha ao enviar SMS', HttpStatus.BAD_GATEWAY);
    }

    this.logger.log(`Verification SMS sent to ${phoneE164.slice(0, 5)}*** (user=${userId})`);
    return successResponse({ sent: true, phoneMasked: `${phoneE164.slice(0, 7)}****` });
  }

  @Post('verify-confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirma código de verificação WhatsApp' })
  @ApiBody({ type: ConfirmVerifyDto })
  async verifyConfirm(@Req() req: any, @Body() body: ConfirmVerifyDto) {
    const userId = req.user?.id;
    const pending = this.pendingCodes.get(userId);
    if (!pending) {
      throw new HttpException('Nenhuma verificação em andamento', HttpStatus.BAD_REQUEST);
    }
    if (Date.now() > pending.expiresAt) {
      this.pendingCodes.delete(userId);
      throw new HttpException('Código expirou, peça um novo', HttpStatus.BAD_REQUEST);
    }
    if (pending.code !== body.code) {
      throw new HttpException('Código incorreto', HttpStatus.BAD_REQUEST);
    }

    // Sucesso: persiste phone + timestamp + upsert prefs
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { whatsappPhone: pending.phone },
      }),
      this.prisma.userPreference.upsert({
        where: { userId },
        create: {
          userId,
          whatsappVerifiedAt: new Date(),
          notifyWhatsApp: true,
        } as any,
        update: {
          whatsappVerifiedAt: new Date(),
          notifyWhatsApp: true,
        } as any,
      }),
    ]);

    this.pendingCodes.delete(userId);
    this.logger.log(`WhatsApp verified for user=${userId}`);
    return successResponse({ verified: true });
  }
}
