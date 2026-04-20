import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '../common/enums';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SocialAuthDto } from './dto/social-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  // TODO(production): Replace in-memory token store with Redis or database persistence.
  // In-memory tokens are lost on restart and don't work with multiple server instances.
  private passwordResetTokens = new Map<string, { userId: string; expiresAt: Date }>();
  private readonly MAX_RESET_TOKENS = 10000;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    const { passwordHash, refreshToken, ...result } = user;
    return result;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        authProvider: AuthProvider.EMAIL,
      },
    });

    // Create default preferences
    await this.prisma.userPreference.create({
      data: {
        userId: user.id,
        preferredPrograms: '[]',
        preferredOrigins: '[]',
        preferredDestinations: '[]',
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.isAdmin, user.subscriptionPlan);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.isAdmin, user.subscriptionPlan);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async socialAuth(dto: SocialAuthDto) {
    if (!dto.email) {
      throw new BadRequestException('Email is required for social authentication');
    }

    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name || dto.email.split('@')[0],
          authProvider: String(dto.provider),
        },
      });

      await this.prisma.userPreference.create({
        data: {
          userId: user.id,
          preferredPrograms: '[]',
          preferredOrigins: '[]',
          preferredDestinations: '[]',
        },
      });
    } else if (user.authProvider !== String(dto.provider) && user.authProvider !== AuthProvider.EMAIL) {
      // Update provider if needed
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { authProvider: String(dto.provider) },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.isAdmin, user.subscriptionPlan);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isMatch = await bcrypt.compare(dto.refreshToken, user.refreshToken);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.isAdmin, user.subscriptionPlan);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async generateTokens(userId: string, email: string, isAdmin: boolean, plan: string) {
    const payload = { sub: userId, email, isAdmin, plan };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // IMPORTANTE: SendGrid ainda não wired. Ao invés de mentir pro user
    // ("enviamos o link") e perder confiança, retornamos instrução clara
    // pra contato via WhatsApp — canal que já temos.
    //
    // Quando SENDGRID_API_KEY for setado + notificationsService tiver o
    // método sendPasswordResetEmail, reativar o fluxo de token via email.
    const hasEmail = process.env.SENDGRID_API_KEY;
    if (!hasEmail) {
      return {
        message:
          'Recuperação de senha por email está sendo implementada. ' +
          'Enquanto isso, entre em contato via WhatsApp em @milhasextras.',
      };
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Evict expired tokens to prevent unbounded Map growth
    this.evictExpiredResetTokens();

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    this.passwordResetTokens.set(token, { userId: user.id, expiresAt });

    // TODO: wire SendGrid — blocked by missing integration
    // await this.notificationsService.sendPasswordResetEmail(user.email, token);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenData = this.passwordResetTokens.get(dto.token);
    if (!tokenData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (new Date() > tokenData.expiresAt) {
      this.passwordResetTokens.delete(dto.token);
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: tokenData.userId },
      data: { passwordHash, refreshToken: null },
    });

    this.passwordResetTokens.delete(dto.token);
    return { message: 'Password reset successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  /** Remove expired password reset tokens to prevent unbounded Map growth */
  private evictExpiredResetTokens() {
    const now = new Date();
    for (const [token, data] of this.passwordResetTokens) {
      if (now > data.expiresAt) {
        this.passwordResetTokens.delete(token);
      }
    }
    // Hard cap: if still too many tokens, remove oldest entries
    if (this.passwordResetTokens.size > this.MAX_RESET_TOKENS) {
      const excess = this.passwordResetTokens.size - this.MAX_RESET_TOKENS;
      const keys = this.passwordResetTokens.keys();
      for (let i = 0; i < excess; i++) {
        const key = keys.next().value;
        if (key) this.passwordResetTokens.delete(key);
      }
    }
  }
}
