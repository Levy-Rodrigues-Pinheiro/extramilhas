import { Test } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PublicApiService } from './public-api.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Specialist review fix #SR-02: API key quota race condition.
 * Tests garantem atomic check-and-increment via updateMany WHERE.
 */
describe('PublicApiService', () => {
  let service: PublicApiService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      apiKey: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [PublicApiService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<PublicApiService>(PublicApiService);
  });

  describe('validateAndUse — quota atomicity', () => {
    it('rejeita key não encontrada', async () => {
      prisma.apiKey.findUnique.mockResolvedValueOnce(null);
      await expect(service.validateAndUse('mx_invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejeita key inativa', async () => {
      prisma.apiKey.findUnique.mockResolvedValueOnce({
        id: 'k1',
        isActive: false,
        tier: 'free',
        ownerId: 'u1',
      });
      await expect(service.validateAndUse('mx_revoked')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejeita key sem prefixo mx_', async () => {
      await expect(service.validateAndUse('not_a_key')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('updateMany com WHERE clause atomic — incrementa só se count < quota', async () => {
      prisma.apiKey.findUnique.mockResolvedValueOnce({
        id: 'k1',
        isActive: true,
        tier: 'free',
        ownerId: 'u1',
        requestsThisMonth: 100,
      });
      prisma.apiKey.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.validateAndUse('mx_test123');
      expect(result.ownerId).toBe('u1');
      expect(result.tier).toBe('free');
      expect(prisma.apiKey.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'k1',
            isActive: true,
            requestsThisMonth: { lt: 3000 },
          }),
          data: expect.objectContaining({
            requestsThisMonth: { increment: 1 },
          }),
        }),
      );
    });

    it('rejeita quando updateMany retorna count=0 (race detectada)', async () => {
      prisma.apiKey.findUnique.mockResolvedValueOnce({
        id: 'k1',
        isActive: true,
        tier: 'free',
        ownerId: 'u1',
        requestsThisMonth: 2999,
      });
      prisma.apiKey.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.validateAndUse('mx_test')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
