import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Group buys (compras em grupo) + Trip swaps (troca de viagens).
 *
 * App só facilita descoberta. Coordenação real acontece fora (WhatsApp).
 * Privacidade: contactValue só visível pra participantes/interessados.
 */
@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  // ─── Group Buys ─────────────────────────────────────────────────────

  async listGroupBuys(params: { status?: string; programId?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 20, 50);
    const where: any = {};
    if (params.status) where.status = params.status;
    else where.status = 'OPEN'; // default só abertos
    if (params.programId) where.programId = params.programId;
    // Exclui expirados
    where.deadline = { gt: new Date() };

    const groups = await (this.prisma as any).groupBuy.findMany({
      where,
      orderBy: { deadline: 'asc' },
      take: limit,
      include: {
        participants: { select: { userId: true, points: true } },
      },
    });

    return groups.map((g: any) => {
      const currentPoints = g.participants.reduce(
        (s: number, p: any) => s + p.points,
        0,
      );
      const percent =
        g.targetPoints > 0
          ? Math.min(100, Math.round((currentPoints / g.targetPoints) * 100))
          : 0;
      // contactValue omitted in listing (só no detail se user é participante)
      const { contactValue, contactMethod, ...rest } = g;
      return {
        ...rest,
        currentPoints,
        participantsCount: g.participants.length,
        percent,
      };
    });
  }

  async createGroupBuy(
    userId: string,
    params: {
      programId: string;
      title: string;
      description: string;
      targetPoints: number;
      deadline: string;
      contactMethod?: string;
      contactValue: string;
    },
  ) {
    if (params.title.length < 5 || params.description.length < 10) {
      throw new ForbiddenException('Título/descrição muito curtos');
    }
    const deadline = new Date(params.deadline);
    if (isNaN(deadline.getTime()) || deadline <= new Date()) {
      throw new ForbiddenException('Deadline inválido');
    }
    return (this.prisma as any).groupBuy.create({
      data: {
        organizerId: userId,
        programId: params.programId,
        title: params.title.slice(0, 200),
        description: params.description.slice(0, 2000),
        targetPoints: params.targetPoints,
        deadline,
        contactMethod: params.contactMethod || 'WHATSAPP',
        contactValue: params.contactValue.slice(0, 200),
      },
    });
  }

  async joinGroupBuy(userId: string, groupBuyId: string, points: number) {
    const group = await (this.prisma as any).groupBuy.findUnique({
      where: { id: groupBuyId },
    });
    if (!group || group.status !== 'OPEN' || group.deadline < new Date()) {
      throw new ForbiddenException('Grupo encerrado');
    }
    if (points < 1000) throw new ForbiddenException('Mín 1000 pontos');
    return (this.prisma as any).groupBuyParticipant.upsert({
      where: { groupBuyId_userId: { groupBuyId, userId } },
      create: { groupBuyId, userId, points },
      update: { points },
    });
  }

  async leaveGroupBuy(userId: string, groupBuyId: string) {
    await (this.prisma as any).groupBuyParticipant.deleteMany({
      where: { groupBuyId, userId },
    });
    return { left: true };
  }

  async getGroupBuyDetail(viewerId: string, groupBuyId: string) {
    const group = await (this.prisma as any).groupBuy.findUnique({
      where: { id: groupBuyId },
      include: {
        participants: true,
      },
    });
    if (!group) throw new NotFoundException('Grupo não encontrado');
    const isParticipant = group.participants.some((p: any) => p.userId === viewerId);
    const isOrganizer = group.organizerId === viewerId;
    const canSeeContact = isParticipant || isOrganizer;
    const currentPoints = group.participants.reduce(
      (s: number, p: any) => s + p.points,
      0,
    );

    // User names pra exibir lista (org pode ver todos)
    const ids = [group.organizerId, ...group.participants.map((p: any) => p.userId)];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return {
      ...group,
      currentPoints,
      percent: Math.min(
        100,
        Math.round((currentPoints / group.targetPoints) * 100),
      ),
      contactValue: canSeeContact ? group.contactValue : null,
      organizerName: userMap.get(group.organizerId) ?? 'Usuário',
      participants: isOrganizer
        ? group.participants.map((p: any) => ({
            ...p,
            userName: userMap.get(p.userId) ?? 'Usuário',
          }))
        : group.participants.map((p: any) => ({ userId: p.userId, points: p.points })),
      myParticipation: isParticipant
        ? group.participants.find((p: any) => p.userId === viewerId)
        : null,
    };
  }

  // ─── Trip Swaps ─────────────────────────────────────────────────────

  async listTripSwaps(params: { status?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 20, 50);
    const where: any = { status: params.status ?? 'OPEN' };
    // Só trips futuras
    where.fromDate = { gte: new Date() };
    const swaps = await (this.prisma as any).tripSwap.findMany({
      where,
      orderBy: { fromDate: 'asc' },
      take: limit,
    });
    // Contact info omitted from listing
    return swaps.map((s: any) => {
      const { contactValue, contactMethod, ...rest } = s;
      return rest;
    });
  }

  async createTripSwap(
    userId: string,
    params: {
      title: string;
      description: string;
      fromCity: string;
      fromDate: string;
      toDate: string;
      desiredInTrade: string;
      estimatedValue: number;
      contactMethod?: string;
      contactValue: string;
    },
  ) {
    const fromDate = new Date(params.fromDate);
    const toDate = new Date(params.toDate);
    if (fromDate <= new Date()) throw new ForbiddenException('fromDate no futuro');
    if (toDate < fromDate) throw new ForbiddenException('toDate >= fromDate');
    return (this.prisma as any).tripSwap.create({
      data: {
        ownerId: userId,
        title: params.title.slice(0, 200),
        description: params.description.slice(0, 2000),
        fromCity: params.fromCity.toUpperCase().slice(0, 10),
        fromDate,
        toDate,
        desiredInTrade: params.desiredInTrade.slice(0, 500),
        estimatedValue: params.estimatedValue,
        contactMethod: params.contactMethod || 'WHATSAPP',
        contactValue: params.contactValue.slice(0, 200),
      },
    });
  }

  async expressInterest(userId: string, tripSwapId: string, message: string) {
    const swap = await (this.prisma as any).tripSwap.findUnique({
      where: { id: tripSwapId },
    });
    if (!swap || swap.status !== 'OPEN') throw new ForbiddenException('Trip não disponível');
    if (swap.ownerId === userId) throw new ForbiddenException('Não é possível expressar interesse no próprio');
    return (this.prisma as any).tripSwapInterest.upsert({
      where: { tripSwapId_userId: { tripSwapId, userId } },
      create: { tripSwapId, userId, message: message.slice(0, 500) },
      update: { message: message.slice(0, 500) },
    });
  }

  async getTripSwapDetail(viewerId: string, tripSwapId: string) {
    const swap = await (this.prisma as any).tripSwap.findUnique({
      where: { id: tripSwapId },
      include: { interests: true },
    });
    if (!swap) throw new NotFoundException('Trip não encontrada');
    const isOwner = swap.ownerId === viewerId;
    const hasInterest = swap.interests.some((i: any) => i.userId === viewerId);
    const canSeeContact = isOwner || hasInterest;

    // Increment view count async
    (this.prisma as any).tripSwap
      .update({ where: { id: tripSwapId }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});

    return {
      ...swap,
      contactValue: canSeeContact ? swap.contactValue : null,
      // Owner vê lista de interesses; outros só contagem
      interests: isOwner ? swap.interests : undefined,
      interestsCount: swap.interests.length,
      myInterest: hasInterest
        ? swap.interests.find((i: any) => i.userId === viewerId)
        : null,
    };
  }
}
