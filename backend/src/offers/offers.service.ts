import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OfferClassification } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { QueryOffersDto } from './dto/query-offers.dto';
import { createPaginatedResult, getPaginationSkip } from '../common/dto/pagination.dto';

@Injectable()
export class OffersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryOffersDto, userPlan?: string) {
    const {
      page = 1,
      limit = 20,
      programId,
      type,
      classification,
      maxCpm,
      minCpm,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = getPaginationSkip(page, limit);

    const where: any = {
      isDeleted: false,
    };

    // Free plan users see offers delayed by 1 hour
    if (!userPlan || userPlan === 'FREE') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      where.createdAt = { lte: oneHourAgo };
    }

    if (programId) where.programId = programId;
    if (type) where.type = type;
    if (classification) where.classification = classification;
    if (isActive !== undefined) where.isActive = isActive;
    else where.isActive = true;

    if (maxCpm !== undefined || minCpm !== undefined) {
      where.cpm = {};
      if (maxCpm !== undefined) where.cpm.lte = maxCpm;
      if (minCpm !== undefined) where.cpm.gte = minCpm;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'cpm') orderBy.cpm = sortOrder;
    else if (sortBy === 'expiresAt') orderBy.expiresAt = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [offers, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        include: {
          program: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.offer.count({ where }),
    ]);

    return createPaginatedResult(offers, total, page, limit);
  }

  async findFeatured(userPlan?: string) {
    const where: any = {
      isActive: true,
      isDeleted: false,
      classification: { in: [OfferClassification.IMPERDIVEL, OfferClassification.BOA] },
    };

    // Free plan delay
    if (!userPlan || userPlan === 'FREE') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      where.createdAt = { lte: oneHourAgo };
    }

    const offers = await this.prisma.offer.findMany({
      where,
      include: {
        program: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
      orderBy: [{ classification: 'asc' }, { cpm: 'asc' }],
      take: 5,
    });

    return offers;
  }

  async findOne(id: string, userPlan?: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id, isDeleted: false },
      include: {
        program: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Free plan delay check
    if (!userPlan || userPlan === 'FREE') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (offer.createdAt > oneHourAgo) {
        throw new ForbiddenException('This offer is only available to Premium/Pro subscribers right now. Upgrade to see it immediately.');
      }
    }

    return offer;
  }

  async saveOffer(userId: string, offerId: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, isDeleted: false },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    await this.prisma.savedOffer.upsert({
      where: { userId_offerId: { userId, offerId } },
      create: { userId, offerId },
      update: {},
    });

    return { message: 'Offer saved successfully' };
  }

  async unsaveOffer(userId: string, offerId: string) {
    const saved = await this.prisma.savedOffer.findUnique({
      where: { userId_offerId: { userId, offerId } },
    });

    if (!saved) {
      throw new NotFoundException('Saved offer not found');
    }

    await this.prisma.savedOffer.delete({
      where: { userId_offerId: { userId, offerId } },
    });

    return { message: 'Offer removed from favorites' };
  }

  async getExploreOffers() {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [bestOfDay, transferBonuses, expiringSoon, flashPromos] = await Promise.all([
      this.prisma.offer.findMany({
        where: { isActive: true, isDeleted: false },
        orderBy: { cpm: 'asc' },
        take: 5,
        include: { program: true },
      }),
      this.prisma.offer.findMany({
        where: { isActive: true, isDeleted: false, type: 'TRANSFER_BONUS' },
        orderBy: { cpm: 'asc' },
        take: 5,
        include: { program: true },
      }),
      this.prisma.offer.findMany({
        where: { isActive: true, isDeleted: false, expiresAt: { lte: threeDaysLater, gte: now } },
        orderBy: { expiresAt: 'asc' },
        take: 5,
        include: { program: true },
      }),
      this.prisma.offer.findMany({
        where: { isActive: true, isDeleted: false, type: 'PROMO', createdAt: { gte: oneDayAgo } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { program: true },
      }),
    ]);

    return {
      sections: [
        { title: 'Melhores do Dia', icon: 'trophy', offers: bestOfDay },
        { title: 'Bônus de Transferência', icon: 'swap-horizontal', offers: transferBonuses },
        { title: 'Expirando em Breve', icon: 'time', offers: expiringSoon },
        { title: 'Promoções Relâmpago', icon: 'flash', offers: flashPromos },
      ],
    };
  }

  async getSavedOffers(userId: string, page: number, limit: number) {
    const skip = getPaginationSkip(page, limit);

    const [savedOffers, total] = await Promise.all([
      this.prisma.savedOffer.findMany({
        where: { userId },
        include: {
          offer: {
            include: {
              program: {
                select: { id: true, name: true, slug: true, logoUrl: true },
              },
            },
          },
        },
        orderBy: { savedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.savedOffer.count({ where: { userId } }),
    ]);

    const offers = savedOffers.map((s) => ({ ...s.offer, savedAt: s.savedAt }));
    return createPaginatedResult(offers, total, page, limit);
  }
}
