import { Test } from '@nestjs/testing';
import { ReferralService } from './referral.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Specialist review fix #SR-04: applyCode double-bonus race.
 * Tests garantem updateMany WHERE referredById:null bloqueia 2x apply.
 */
describe('ReferralService', () => {
  let service: ReferralService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    const module = await Test.createTestingModule({
      providers: [ReferralService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ReferralService>(ReferralService);
  });

  describe('applyCode — race condition prevention', () => {
    const recentDate = new Date(Date.now() - 86400_000); // 1d ago
    const oldDate = new Date(Date.now() - 30 * 86400_000); // 30d ago

    it('rejeita se user já tem referredById', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        createdAt: recentDate,
        referredById: 'someone',
      });
      await expect(service.applyCode('u1', 'CODE123')).rejects.toThrow(
        'já usou um código',
      );
    });

    it('rejeita user com >7d de registro', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        createdAt: oldDate,
        referredById: null,
        referralCode: 'OWN',
      });
      await expect(service.applyCode('u1', 'CODE123')).rejects.toThrow(
        'primeiros 7 dias',
      );
    });

    it('rejeita código próprio', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        createdAt: recentDate,
        referredById: null,
        referralCode: 'OWN',
      });
      await expect(service.applyCode('u1', 'OWN')).rejects.toThrow(
        'próprio código',
      );
    });

    it('rejeita código inválido', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        createdAt: recentDate,
        referredById: null,
        referralCode: 'OWN',
        subscriptionPlan: 'FREE',
      });
      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(service.applyCode('u1', 'NOTEXIST')).rejects.toThrow(
        'inválido',
      );
    });

    it('aplica código quando válido + concede Premium pros 2', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        createdAt: recentDate,
        referredById: null,
        referralCode: 'OWN',
        subscriptionPlan: 'FREE',
        subscriptionExpiresAt: null,
      });
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'referrer',
        referralCode: 'CODE123',
        subscriptionPlan: 'FREE',
        subscriptionExpiresAt: null,
      });
      prisma.user.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.user.update.mockResolvedValueOnce({});

      await service.applyCode('u1', 'CODE123');

      // Crítico: usa updateMany WHERE referredById:null pra atomicidade
      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'u1',
            referredById: null,
          }),
        }),
      );
    });

    it('rejeita se updateMany count=0 (race detectada — outro request aplicou primeiro)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        createdAt: recentDate,
        referredById: null,
        referralCode: 'OWN',
        subscriptionPlan: 'FREE',
        subscriptionExpiresAt: null,
      });
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'referrer',
        referralCode: 'CODE123',
        subscriptionPlan: 'FREE',
      });
      prisma.user.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.applyCode('u1', 'CODE123')).rejects.toThrow(
        /race condition/,
      );
      // Crítico: NÃO deve atualizar referrer (sem double-bonus pra ele)
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
