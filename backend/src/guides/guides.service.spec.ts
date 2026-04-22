import { Test } from '@nestjs/testing';
import { GuidesService } from './guides.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Specialist review fix #SR-01: toggleUpvote race condition.
 * Tests garantem transação + idempotência (P2002 catch).
 */
describe('GuidesService', () => {
  let service: GuidesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      guideUpvote: {
        findUnique: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
      },
      userGuide: {
        update: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };
    const module = await Test.createTestingModule({
      providers: [GuidesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<GuidesService>(GuidesService);
  });

  describe('toggleUpvote — race condition handling', () => {
    it('cria upvote + incrementa count se não existe', async () => {
      prisma.guideUpvote.findUnique.mockResolvedValueOnce(null);
      prisma.guideUpvote.create.mockResolvedValueOnce({});

      const result = await service.toggleUpvote('user-1', 'guide-1');
      expect(result.upvoted).toBe(true);
      expect(prisma.userGuide.update).toHaveBeenCalledWith({
        where: { id: 'guide-1' },
        data: { upvoteCount: { increment: 1 } },
      });
    });

    it('remove upvote + decrementa count se já existe', async () => {
      prisma.guideUpvote.findUnique.mockResolvedValueOnce({ id: 'upvote-1' });
      prisma.guideUpvote.delete.mockResolvedValueOnce({});

      const result = await service.toggleUpvote('user-1', 'guide-1');
      expect(result.upvoted).toBe(false);
      expect(prisma.userGuide.update).toHaveBeenCalledWith({
        where: { id: 'guide-1' },
        data: { upvoteCount: { decrement: 1 } },
      });
    });

    it('idempotente: P2002 (race) trata como upvoted=true sem double-count', async () => {
      prisma.guideUpvote.findUnique.mockResolvedValueOnce(null);
      const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      prisma.guideUpvote.create.mockRejectedValueOnce(p2002);

      const result = await service.toggleUpvote('user-1', 'guide-1');
      expect(result.upvoted).toBe(true);
      // Crítico: NÃO deve incrementar count quando race detectada
      expect(prisma.userGuide.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: { upvoteCount: { increment: 1 } } }),
      );
    });

    it('propaga erros não-P2002 (ex: DB connection)', async () => {
      prisma.guideUpvote.findUnique.mockResolvedValueOnce(null);
      prisma.guideUpvote.create.mockRejectedValueOnce(new Error('DB down'));

      await expect(service.toggleUpvote('user-1', 'guide-1')).rejects.toThrow(
        'DB down',
      );
    });

    it('toda operação dentro de $transaction', async () => {
      prisma.guideUpvote.findUnique.mockResolvedValueOnce(null);
      prisma.guideUpvote.create.mockResolvedValueOnce({});

      await service.toggleUpvote('user-1', 'guide-1');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
