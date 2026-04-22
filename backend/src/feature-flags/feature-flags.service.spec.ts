import { Test } from '@nestjs/testing';
import { FeatureFlagsService } from './feature-flags.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tests garantem determinismo do bucket por user — fundamental pra A/B
 * test não vir flaky entre requests.
 */
describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      featureFlag: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
      experiment: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [FeatureFlagsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  describe('isEnabled — bucket determinism', () => {
    it('flag inexistente retorna false', async () => {
      prisma.featureFlag.findUnique.mockResolvedValueOnce(null);
      const result = await service.isEnabled('non-existent', 'user-1');
      expect(result).toBe(false);
    });

    it('mode=off sempre retorna false', async () => {
      prisma.featureFlag.findUnique.mockResolvedValueOnce({
        key: 'test',
        mode: 'off',
        percentage: 100,
        allowlist: '[]',
      });
      expect(await service.isEnabled('test', 'user-1')).toBe(false);
    });

    it('mode=on sempre retorna true', async () => {
      prisma.featureFlag.findUnique.mockResolvedValueOnce({
        key: 'test',
        mode: 'on',
        percentage: 0,
        allowlist: '[]',
      });
      expect(await service.isEnabled('test', 'user-1')).toBe(true);
    });

    it('rollout: same userId = same bucket (determinístico)', async () => {
      const flag = {
        key: 'test',
        mode: 'rollout',
        percentage: 50,
        allowlist: '[]',
      };
      prisma.featureFlag.findUnique.mockResolvedValue(flag);
      const a = await service.isEnabled('test', 'user-stable-id');
      const b = await service.isEnabled('test', 'user-stable-id');
      expect(a).toBe(b); // determinismo
    });

    it('rollout 100% sempre true', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({
        key: 'test',
        mode: 'rollout',
        percentage: 100,
        allowlist: '[]',
      });
      // Vários userIds aleatórios, todos devem passar
      for (const uid of ['a', 'b', 'c', 'd', 'long-user-id-xyz']) {
        expect(await service.isEnabled('test', uid)).toBe(true);
      }
    });

    it('rollout 0% sempre false', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({
        key: 'test',
        mode: 'rollout',
        percentage: 0,
        allowlist: '[]',
      });
      for (const uid of ['a', 'b', 'c', 'd']) {
        expect(await service.isEnabled('test', uid)).toBe(false);
      }
    });

    it('allowlist sempre passa, mesmo com percentage=0', async () => {
      prisma.featureFlag.findUnique.mockResolvedValueOnce({
        key: 'test',
        mode: 'rollout',
        percentage: 0,
        allowlist: '["staff-user-id"]',
      });
      expect(await service.isEnabled('test', 'staff-user-id')).toBe(true);
    });

    it('sem userId em rollout retorna false (evita flakiness)', async () => {
      prisma.featureFlag.findUnique.mockResolvedValueOnce({
        key: 'test',
        mode: 'rollout',
        percentage: 100,
        allowlist: '[]',
      });
      expect(await service.isEnabled('test')).toBe(false);
    });
  });

  describe('assignVariant — A/B test determinism', () => {
    it('experimento inativo retorna null', async () => {
      prisma.experiment.findUnique.mockResolvedValueOnce({
        key: 'ab-test',
        isActive: false,
        variants: '[]',
      });
      expect(await service.assignVariant('ab-test', 'user-1')).toBeNull();
    });

    it('mesmo user sempre cai na mesma variante', async () => {
      const exp = {
        key: 'ab-test',
        isActive: true,
        variants: JSON.stringify([
          { name: 'control', weight: 50 },
          { name: 'variant', weight: 50 },
        ]),
      };
      prisma.experiment.findUnique.mockResolvedValue(exp);
      const a = await service.assignVariant('ab-test', 'stable-user');
      const b = await service.assignVariant('ab-test', 'stable-user');
      expect(a).toBe(b);
      expect(['control', 'variant']).toContain(a);
    });

    it('weights respeitados (100% em uma variante)', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        key: 'ab-test',
        isActive: true,
        variants: JSON.stringify([
          { name: 'only', weight: 100 },
          { name: 'unused', weight: 0 },
        ]),
      });
      expect(await service.assignVariant('ab-test', 'u1')).toBe('only');
      expect(await service.assignVariant('ab-test', 'u2')).toBe('only');
    });
  });
});
