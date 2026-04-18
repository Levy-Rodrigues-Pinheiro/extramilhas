import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionPlan } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import {
  createPaginatedResult,
  getPaginationSkip,
  PaginationDto,
} from '../common/dto/pagination.dto';

const PLAN_ALERT_LIMITS: Record<SubscriptionPlan, number> = {
  FREE: 1,
  PREMIUM: 10,
  PRO: Infinity,
};

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async getAlerts(userId: string) {
    return this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAlert(userId: string, dto: CreateAlertDto, userPlan: SubscriptionPlan) {
    const currentCount = await this.prisma.alert.count({ where: { userId } });
    const limit = PLAN_ALERT_LIMITS[userPlan] ?? 1;

    if (currentCount >= limit) {
      throw new ForbiddenException('Limite de alertas atingido para seu plano');
    }

    return this.prisma.alert.create({
      data: {
        userId,
        type: dto.type,
        conditions: dto.conditions as any,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateAlert(userId: string, alertId: string, dto: UpdateAlertDto) {
    const alert = await this.prisma.alert.findUnique({ where: { id: alertId } });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this alert');
    }

    return this.prisma.alert.update({
      where: { id: alertId },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.conditions !== undefined && { conditions: dto.conditions as any }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteAlert(userId: string, alertId: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id: alertId } });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (alert.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this alert');
    }

    await this.prisma.alert.delete({ where: { id: alertId } });
    return { message: 'Alert deleted successfully' };
  }

  async getAlertHistory(userId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = getPaginationSkip(page, limit);

    const [histories, total] = await Promise.all([
      this.prisma.alertHistory.findMany({
        where: {
          alert: { userId },
        },
        include: {
          alert: true,
          offer: {
            include: {
              program: {
                select: { id: true, name: true, slug: true, logoUrl: true },
              },
            },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.alertHistory.count({
        where: { alert: { userId } },
      }),
    ]);

    return createPaginatedResult(histories, total, page, limit);
  }
}
