import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async listUpcoming(params?: { limit?: number }) {
    const limit = Math.min(params?.limit ?? 20, 50);
    const now = new Date();
    const events = await (this.prisma as any).event.findMany({
      where: {
        isPublished: true,
        startsAt: { gte: now },
      },
      orderBy: { startsAt: 'asc' },
      take: limit,
      include: {
        rsvps: { select: { userId: true, status: true } },
      },
    });
    return events.map((e: any) => {
      const going = e.rsvps.filter((r: any) => r.status === 'GOING').length;
      const { rsvps, ...rest } = e;
      return { ...rest, goingCount: going };
    });
  }

  async getEventDetail(viewerId: string, eventId: string) {
    const e = await (this.prisma as any).event.findUnique({
      where: { id: eventId },
      include: {
        rsvps: { select: { userId: true, status: true } },
      },
    });
    if (!e) throw new NotFoundException('Evento não encontrado');

    const going = e.rsvps.filter((r: any) => r.status === 'GOING').length;
    const myRsvp = e.rsvps.find((r: any) => r.userId === viewerId);
    const isFull = e.maxAttendees > 0 && going >= e.maxAttendees;

    return {
      ...e,
      rsvps: undefined,
      goingCount: going,
      isFull,
      myRsvpStatus: myRsvp?.status ?? null,
    };
  }

  async rsvp(userId: string, eventId: string, status: string) {
    if (!['GOING', 'MAYBE', 'CANCELED'].includes(status)) {
      throw new ForbiddenException('Status inválido');
    }

    const event = await (this.prisma as any).event.findUnique({
      where: { id: eventId },
    });
    if (!event || !event.isPublished) throw new NotFoundException('Evento não disponível');
    if (event.startsAt < new Date()) throw new ForbiddenException('Evento já começou');

    // Premium only gate
    if (event.premiumOnly) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionPlan: true },
      });
      if (user?.subscriptionPlan === 'FREE') {
        throw new ForbiddenException('Evento exclusivo pra assinantes Premium');
      }
    }

    // Check capacity se GOING
    if (status === 'GOING' && event.maxAttendees > 0) {
      const currentGoing = await (this.prisma as any).eventRsvp.count({
        where: { eventId, status: 'GOING' },
      });
      if (currentGoing >= event.maxAttendees) {
        throw new ForbiddenException('Evento lotado');
      }
    }

    return (this.prisma as any).eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status },
      update: { status },
    });
  }

  async myUpcomingRsvps(userId: string) {
    const now = new Date();
    const rsvps = await (this.prisma as any).eventRsvp.findMany({
      where: {
        userId,
        status: { in: ['GOING', 'MAYBE'] },
        event: { startsAt: { gte: now }, isPublished: true },
      },
      include: { event: true },
      orderBy: { event: { startsAt: 'asc' } },
    });
    return rsvps.map((r: any) => ({ ...r.event, myRsvpStatus: r.status }));
  }

  // Admin
  async adminCreate(params: {
    title: string;
    description: string;
    kind?: string;
    startsAt: string;
    endsAt?: string;
    location: string;
    isOnline?: boolean;
    city?: string;
    maxAttendees?: number;
    premiumOnly?: boolean;
    coverImage?: string;
  }) {
    return (this.prisma as any).event.create({
      data: {
        title: params.title.slice(0, 200),
        description: params.description.slice(0, 5000),
        kind: params.kind ?? 'WEBINAR',
        startsAt: new Date(params.startsAt),
        endsAt: params.endsAt ? new Date(params.endsAt) : null,
        location: params.location,
        isOnline: params.isOnline ?? true,
        city: params.city ?? null,
        maxAttendees: params.maxAttendees ?? 0,
        premiumOnly: params.premiumOnly ?? false,
        coverImage: params.coverImage ?? null,
        isPublished: false,
      },
    });
  }

  async adminPublish(eventId: string) {
    return (this.prisma as any).event.update({
      where: { id: eventId },
      data: { isPublished: true },
    });
  }
}
