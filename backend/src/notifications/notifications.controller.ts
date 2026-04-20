import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { successResponse } from '../common/helpers/response.helper';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Notification Center — histórico in-app de notificações recebidas.
 * Útil pros usuários que perdem o push (dispensa rápido, não viram).
 *
 * Design:
 *  - GET /notifications → últimas 50, com unreadCount
 *  - PUT /notifications/:id/read → marca uma
 *  - POST /notifications/read-all → marca todas
 */
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('notifications-feed')
export class NotificationsFeedController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista notificações in-app + unreadCount' })
  async list(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user?.id;
    const take = Math.min(200, parseInt(limit || '50', 10) || 50);

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return successResponse({
      count: notifications.length,
      unreadCount,
      notifications: notifications.map((n) => ({
        ...n,
        data: n.data ? safeParse(n.data) : null,
      })),
    });
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Marca uma notificação como lida' })
  async markRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return successResponse({ marked: true });
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Marca todas como lidas' })
  async markAllRead(@Req() req: any) {
    const userId = req.user?.id;
    const r = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return successResponse({ markedCount: r.count });
  }
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
