import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripPlansService {
  constructor(private prisma: PrismaService) {}

  private genInviteToken(): string {
    return randomBytes(6).toString('base64url').slice(0, 8).toUpperCase();
  }

  async create(
    userId: string,
    params: {
      title: string;
      description?: string;
      mainDestination?: string;
      startDate?: string;
      endDate?: string;
      targetMiles?: number;
      targetBrl?: number;
    },
  ) {
    const plan = await (this.prisma as any).tripPlan.create({
      data: {
        ownerId: userId,
        title: params.title.slice(0, 200),
        description: params.description?.slice(0, 2000),
        mainDestination: params.mainDestination?.toUpperCase().slice(0, 10),
        startDate: params.startDate ? new Date(params.startDate) : null,
        endDate: params.endDate ? new Date(params.endDate) : null,
        targetMiles: params.targetMiles ?? 0,
        targetBrl: params.targetBrl ?? 0,
        inviteToken: this.genInviteToken(),
      },
    });
    // Owner é membro automático
    await (this.prisma as any).tripPlanMember.create({
      data: { tripPlanId: plan.id, userId, role: 'OWNER' },
    });
    return plan;
  }

  async listMine(userId: string) {
    const memberships = await (this.prisma as any).tripPlanMember.findMany({
      where: { userId },
      include: { trip: true },
      orderBy: { trip: { updatedAt: 'desc' } },
    });
    return memberships.map((m: any) => ({
      ...m.trip,
      myRole: m.role,
    }));
  }

  private async assertMember(userId: string, tripPlanId: string): Promise<string> {
    const m = await (this.prisma as any).tripPlanMember.findUnique({
      where: { tripPlanId_userId: { tripPlanId, userId } },
    });
    if (!m) throw new ForbiddenException('Não é membro desta viagem');
    return m.role;
  }

  async getDetail(userId: string, tripPlanId: string) {
    const role = await this.assertMember(userId, tripPlanId);
    const [plan, members, items] = await Promise.all([
      (this.prisma as any).tripPlan.findUnique({ where: { id: tripPlanId } }),
      (this.prisma as any).tripPlanMember.findMany({ where: { tripPlanId } }),
      (this.prisma as any).tripPlanItem.findMany({
        where: { tripPlanId },
        orderBy: { orderIndex: 'asc' },
      }),
    ]);
    if (!plan) throw new NotFoundException('Viagem não encontrada');

    // Enrich members com names
    const memberUserIds: string[] = members.map((m: any) => m.userId as string);
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberUserIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const totalMiles = items.reduce((s: number, i: any) => s + i.milesCost, 0);
    const totalBrl = items.reduce((s: number, i: any) => s + i.brlCost, 0);

    return {
      plan,
      members: members.map((m: any) => ({ ...m, userName: userMap.get(m.userId) ?? 'Usuário' })),
      items,
      myRole: role,
      totals: {
        totalMiles,
        totalBrl: Math.round(totalBrl * 100) / 100,
        milesProgress: plan.targetMiles > 0
          ? Math.round((totalMiles / plan.targetMiles) * 100)
          : 0,
        brlProgress: plan.targetBrl > 0
          ? Math.round((totalBrl / plan.targetBrl) * 100)
          : 0,
      },
    };
  }

  async joinByToken(userId: string, token: string) {
    const plan = await (this.prisma as any).tripPlan.findUnique({
      where: { inviteToken: token.toUpperCase() },
    });
    if (!plan) throw new NotFoundException('Invite token inválido');
    if (plan.status !== 'OPEN') throw new ForbiddenException('Viagem não aceita novos membros');
    const existing = await (this.prisma as any).tripPlanMember.findUnique({
      where: { tripPlanId_userId: { tripPlanId: plan.id, userId } },
    });
    if (existing) return { alreadyMember: true, tripPlanId: plan.id };
    await (this.prisma as any).tripPlanMember.create({
      data: { tripPlanId: plan.id, userId, role: 'EDITOR' },
    });

    // Notifica owner
    await this.prisma.notification.create({
      data: {
        userId: plan.ownerId,
        title: '👥 Novo membro na viagem',
        body: `Alguém entrou no planejamento "${plan.title}"`,
        type: 'trip_join',
        data: JSON.stringify({ tripPlanId: plan.id }),
      },
    });

    return { alreadyMember: false, tripPlanId: plan.id };
  }

  async addItem(
    userId: string,
    tripPlanId: string,
    params: {
      kind: string;
      title: string;
      description?: string;
      metadata?: Record<string, unknown>;
      milesCost?: number;
      brlCost?: number;
    },
  ) {
    const role = await this.assertMember(userId, tripPlanId);
    if (role === 'VIEWER') throw new ForbiddenException('Viewer não adiciona itens');

    const lastItem = await (this.prisma as any).tripPlanItem.findFirst({
      where: { tripPlanId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const nextOrder = (lastItem?.orderIndex ?? 0) + 1;

    return (this.prisma as any).tripPlanItem.create({
      data: {
        tripPlanId,
        addedBy: userId,
        kind: params.kind,
        title: params.title.slice(0, 200),
        description: params.description?.slice(0, 2000),
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        milesCost: params.milesCost ?? 0,
        brlCost: params.brlCost ?? 0,
        orderIndex: nextOrder,
      },
    });
  }

  async toggleItemConfirmed(userId: string, tripPlanId: string, itemId: string) {
    await this.assertMember(userId, tripPlanId);
    const item = await (this.prisma as any).tripPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.tripPlanId !== tripPlanId) {
      throw new NotFoundException('Item não encontrado');
    }
    return (this.prisma as any).tripPlanItem.update({
      where: { id: itemId },
      data: { isConfirmed: !item.isConfirmed },
    });
  }

  async deleteItem(userId: string, tripPlanId: string, itemId: string) {
    const role = await this.assertMember(userId, tripPlanId);
    if (role === 'VIEWER') throw new ForbiddenException('Viewer não remove');
    await (this.prisma as any).tripPlanItem.deleteMany({
      where: { id: itemId, tripPlanId },
    });
    return { deleted: true };
  }

  async lockTrip(userId: string, tripPlanId: string) {
    const plan = await (this.prisma as any).tripPlan.findUnique({
      where: { id: tripPlanId },
    });
    if (!plan || plan.ownerId !== userId) throw new ForbiddenException('Só owner tranca');
    return (this.prisma as any).tripPlan.update({
      where: { id: tripPlanId },
      data: { status: 'LOCKED' },
    });
  }
}
