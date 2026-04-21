import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MentorshipService {
  constructor(private prisma: PrismaService) {}

  async upsertProfile(
    userId: string,
    params: {
      role: string;
      expertise: string;
      experience: string;
      interests?: string[];
      bio?: string;
      hoursPerWeek?: number;
    },
  ) {
    if (!['MENTOR', 'MENTEE', 'BOTH'].includes(params.role)) {
      throw new ForbiddenException('Role inválido');
    }
    return (this.prisma as any).mentorProfile.upsert({
      where: { userId },
      create: {
        userId,
        role: params.role,
        expertise: params.expertise.slice(0, 200),
        experience: params.experience.slice(0, 100),
        interests: JSON.stringify(params.interests ?? []),
        bio: params.bio?.slice(0, 500),
        hoursPerWeek: params.hoursPerWeek ?? 1,
      },
      update: {
        role: params.role,
        expertise: params.expertise.slice(0, 200),
        experience: params.experience.slice(0, 100),
        interests: JSON.stringify(params.interests ?? []),
        bio: params.bio?.slice(0, 500),
        hoursPerWeek: params.hoursPerWeek ?? 1,
      },
    });
  }

  async getMyProfile(userId: string) {
    return (this.prisma as any).mentorProfile.findUnique({ where: { userId } });
  }

  /**
   * Lista mentores ativos. Ordenado por hoursPerWeek desc (mais disponíveis
   * primeiro). Interests match faz score: cada tag em comum = +1.
   */
  async findMentors(params: { interests?: string[]; limit?: number }) {
    const limit = Math.min(params.limit ?? 20, 50);
    const mentors = await (this.prisma as any).mentorProfile.findMany({
      where: {
        role: { in: ['MENTOR', 'BOTH'] },
        isActive: true,
      },
      orderBy: { hoursPerWeek: 'desc' },
      take: limit * 2, // busca extra pra filtrar por score
    });

    // Enrich com user name
    const userIds: string[] = mentors.map((m: any) => m.userId as string);
    const users = (await (this.prisma.user as any).findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, publicUsername: true, publicAvatarUrl: true },
    })) as Array<{
      id: string;
      name: string;
      publicUsername: string | null;
      publicAvatarUrl: string | null;
    }>;
    const userMap = new Map(users.map((u) => [u.id, u]));

    const scored = mentors
      .map((m: any) => {
        let matchScore = 0;
        if (params.interests && params.interests.length > 0) {
          try {
            const mInt = JSON.parse(m.interests) as string[];
            matchScore = mInt.filter((i) =>
              params.interests!.some((qi) => qi.toLowerCase() === i.toLowerCase()),
            ).length;
          } catch {
            /* ignore */
          }
        }
        const user = userMap.get(m.userId);
        return {
          id: m.id,
          userId: m.userId,
          userName: user?.name ?? 'Usuário',
          publicUsername: user?.publicUsername ?? null,
          publicAvatarUrl: user?.publicAvatarUrl ?? null,
          role: m.role,
          expertise: m.expertise,
          experience: m.experience,
          interests: (() => {
            try {
              return JSON.parse(m.interests);
            } catch {
              return [];
            }
          })(),
          bio: m.bio,
          hoursPerWeek: m.hoursPerWeek,
          matchScore,
        };
      })
      .sort((a: any, b: any) => b.matchScore - a.matchScore || b.hoursPerWeek - a.hoursPerWeek)
      .slice(0, limit);

    return scored;
  }

  async requestMentorship(userId: string, mentorId: string, message: string) {
    if (message.length < 20) throw new ForbiddenException('Pitch mín 20 chars');
    const menteeProfile = await (this.prisma as any).mentorProfile.findUnique({
      where: { userId },
    });
    if (!menteeProfile) {
      throw new ForbiddenException('Crie seu perfil de mentoria primeiro (/mentorship/profile)');
    }
    const mentor = await (this.prisma as any).mentorProfile.findUnique({
      where: { id: mentorId },
    });
    if (!mentor || !mentor.isActive) throw new NotFoundException('Mentor não disponível');
    if (mentor.id === menteeProfile.id) throw new ForbiddenException('Não pode pedir a si mesmo');

    return (this.prisma as any).mentorshipRequest.upsert({
      where: { mentorId_menteeId: { mentorId, menteeId: menteeProfile.id } },
      create: {
        mentorId,
        menteeId: menteeProfile.id,
        message: message.slice(0, 1000),
        status: 'PENDING',
      },
      update: {
        message: message.slice(0, 1000),
        status: 'PENDING',
      },
    });
  }

  async respondToRequest(
    userId: string,
    requestId: string,
    decision: 'ACCEPT' | 'DECLINE',
  ) {
    const req = await (this.prisma as any).mentorshipRequest.findUnique({
      where: { id: requestId },
      include: { mentor: true },
    });
    if (!req) throw new NotFoundException('Request não encontrado');
    if (req.mentor.userId !== userId) throw new ForbiddenException('Só mentor responde');

    const newStatus = decision === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
    const updated = await (this.prisma as any).mentorshipRequest.update({
      where: { id: requestId },
      data: { status: newStatus, respondedAt: new Date() },
    });

    // Notifica mentee
    const menteeProfile = await (this.prisma as any).mentorProfile.findUnique({
      where: { id: req.menteeId },
    });
    if (menteeProfile) {
      await this.prisma.notification.create({
        data: {
          userId: menteeProfile.userId,
          title:
            decision === 'ACCEPT'
              ? '🎓 Mentor aceitou!'
              : '📩 Resposta do mentor',
          body:
            decision === 'ACCEPT'
              ? 'Seu pedido de mentoria foi aceito. Combine próximos passos com ele.'
              : 'Seu pedido foi recusado por agora. Tente outro mentor.',
          type: 'mentorship_response',
          data: JSON.stringify({ requestId, decision }),
        },
      });
    }

    return updated;
  }

  async myRequests(userId: string) {
    const profile = await (this.prisma as any).mentorProfile.findUnique({
      where: { userId },
    });
    if (!profile) return { asMentor: [], asMentee: [] };

    const [asMentor, asMentee] = await Promise.all([
      (this.prisma as any).mentorshipRequest.findMany({
        where: { mentorId: profile.id },
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).mentorshipRequest.findMany({
        where: { menteeId: profile.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Enrich com nomes
    const profileIds: string[] = Array.from(
      new Set([
        ...asMentor.map((r: any) => r.menteeId as string),
        ...asMentee.map((r: any) => r.mentorId as string),
      ]),
    );
    const profiles = await (this.prisma as any).mentorProfile.findMany({
      where: { id: { in: profileIds } },
    });
    const profileUserIds = profiles.map((p: any) => p.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: profileUserIds } },
      select: { id: true, name: true },
    });
    const profileMap = new Map(
      profiles.map((p: any) => [
        p.id,
        users.find((u) => u.id === p.userId)?.name ?? 'Usuário',
      ]),
    );

    return {
      asMentor: asMentor.map((r: any) => ({
        ...r,
        counterpartName: profileMap.get(r.menteeId),
      })),
      asMentee: asMentee.map((r: any) => ({
        ...r,
        counterpartName: profileMap.get(r.mentorId),
      })),
    };
  }
}
