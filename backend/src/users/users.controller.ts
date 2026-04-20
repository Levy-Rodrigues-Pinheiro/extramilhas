import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpsertMilesBalanceDto } from './dto/upsert-miles-balance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { successResponse } from '../common/helpers/response.helper';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    const result = await this.usersService.getProfile(user.id);
    return successResponse(result);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    const result = await this.usersService.updateProfile(user.id, dto);
    return successResponse(result, 'Profile updated successfully');
  }

  @Delete('me')
  @ApiOperation({
    summary: 'Delete conta do user corrente (LGPD). Soft delete + anonimização.',
  })
  async deleteMe(@CurrentUser() user: any, @Body() body: { confirmEmail: string }) {
    if (body?.confirmEmail !== user.email) {
      throw new BadRequestException(
        'confirmEmail precisa ser idêntico ao email da conta (confirmação de deleção)',
      );
    }
    await this.usersService.deleteAccount(user.id);
    return successResponse({ deleted: true }, 'Conta excluída. Dados anonimizados.');
  }

  @Put('password')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!body?.currentPassword || !body?.newPassword) {
      throw new BadRequestException('currentPassword e newPassword obrigatórios');
    }
    if (body.newPassword.length < 6) {
      throw new BadRequestException('Nova senha deve ter ao menos 6 caracteres');
    }
    await this.usersService.changePassword(user.id, body.currentPassword, body.newPassword);
    return successResponse({ changed: true }, 'Senha alterada');
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  async getPreferences(@CurrentUser() user: any) {
    const result = await this.usersService.getPreferences(user.id);
    return successResponse(result);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(@CurrentUser() user: any, @Body() dto: UpdatePreferencesDto) {
    const result = await this.usersService.updatePreferences(user.id, dto);
    return successResponse(result, 'Preferences updated successfully');
  }

  @Get('miles-balance')
  @ApiOperation({ summary: 'Get all miles/points balances' })
  async getMilesBalance(@CurrentUser() user: any) {
    const result = await this.usersService.getMilesBalance(user.id);
    return successResponse(result);
  }

  @Get('wallet/summary')
  @ApiOperation({
    summary: 'Wallet summary com valor calculado em R$, programas, alertas de expiração',
  })
  async getWalletSummary(@CurrentUser() user: any) {
    const result = await this.usersService.getWalletSummary(user.id);
    return successResponse(result);
  }

  @Put('miles-balance')
  @ApiOperation({ summary: 'Upsert miles balance for a program' })
  async upsertMilesBalance(@CurrentUser() user: any, @Body() dto: UpsertMilesBalanceDto) {
    const result = await this.usersService.upsertMilesBalance(user.id, dto);
    return successResponse(result, 'Miles balance updated successfully');
  }

  @Delete('miles-balance/:programId')
  @ApiOperation({ summary: 'Remove o saldo de um programa específico da carteira' })
  async deleteMilesBalance(@CurrentUser() user: any, @Param('programId') programId: string) {
    const result = await this.usersService.deleteMilesBalance(user.id, programId);
    return successResponse(result, 'Saldo removido');
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get paginated notifications' })
  async getNotifications(@CurrentUser() user: any, @Query() pagination: PaginationDto) {
    const result = await this.usersService.getNotifications(
      user.id,
      pagination.page || 1,
      pagination.limit || 20,
    );
    return successResponse(result);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadCount(@CurrentUser() user: any) {
    const result = await this.usersService.getUnreadNotificationsCount(user.id);
    return successResponse(result);
  }

  @Put('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: any) {
    const result = await this.usersService.markAllNotificationsRead(user.id);
    return successResponse(result);
  }

  @Put('notifications/:id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.usersService.markNotificationRead(user.id, id);
    return successResponse(result, 'Notification marked as read');
  }

  @Get('family')
  @ApiOperation({ summary: 'Get family members with balances' })
  async getFamilyMembers(@CurrentUser() user: any) {
    const result = await this.usersService.getFamilyMembers(user.id);
    return successResponse(result);
  }

  @Post('family')
  @ApiOperation({ summary: 'Add a family member' })
  async addFamilyMember(@CurrentUser() user: any, @Body() body: { name: string; relationship: string }) {
    const result = await this.usersService.addFamilyMember(user.id, body.name, body.relationship);
    return successResponse(result, 'Family member added');
  }

  @Delete('family/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a family member' })
  async deleteFamilyMember(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.usersService.deleteFamilyMember(user.id, id);
    return successResponse(result);
  }

  @Put('family/:id/balance')
  @ApiOperation({ summary: 'Update family member miles balance' })
  async updateFamilyMemberBalance(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { programId: string; balance: number; expiresAt?: string },
  ) {
    const result = await this.usersService.updateFamilyMemberBalance(user.id, id, body.programId, body.balance, body.expiresAt);
    return successResponse(result, 'Balance updated');
  }

  @Delete('family/:id/balance/:programId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove programa específico do saldo de um membro' })
  async deleteFamilyMemberBalance(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('programId') programId: string,
  ) {
    const result = await this.usersService.deleteFamilyMemberBalance(user.id, id, programId);
    return successResponse(result);
  }

  @Get('miles-expiring')
  @ApiOperation({ summary: 'Get expiring miles balances (next 30 days)' })
  async getExpiringBalances(@CurrentUser() user: any) {
    const result = await this.usersService.getExpiringBalances(user.id);
    return successResponse(result);
  }

  @Put('whatsapp')
  @ApiOperation({ summary: 'Update WhatsApp phone number' })
  async updateWhatsapp(@CurrentUser() user: any, @Body() body: { phone: string }) {
    const result = await this.usersService.updateWhatsappPhone(user.id, body.phone);
    return successResponse(result, 'WhatsApp phone updated');
  }
}
