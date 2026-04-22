import { Test } from '@nestjs/testing';
import { QuizzesService } from './quizzes.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tests focados em raça/correção das fixes de specialist review:
 * - genUniqueCertNumber retry on collision
 * - submitAttempt em transação atômica
 */
describe('QuizzesService', () => {
  let service: QuizzesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      quiz: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      certificate: { findUnique: jest.fn(), create: jest.fn() },
      quizAttempt: { create: jest.fn() },
      $transaction: jest.fn((fn: any) =>
        typeof fn === 'function' ? fn(prisma) : Promise.all(fn),
      ),
    };
    const module = await Test.createTestingModule({
      providers: [QuizzesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<QuizzesService>(QuizzesService);
  });

  describe('genUniqueCertNumber', () => {
    it('retorna primeiro candidato se não há colisão', async () => {
      prisma.certificate.findUnique.mockResolvedValueOnce(null);
      const result = await (service as any).genUniqueCertNumber();
      expect(result).toMatch(/^MX-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
      expect(prisma.certificate.findUnique).toHaveBeenCalledTimes(1);
    });

    it('retry on colisão até encontrar único', async () => {
      prisma.certificate.findUnique
        .mockResolvedValueOnce({ id: 'collision' })
        .mockResolvedValueOnce({ id: 'collision' })
        .mockResolvedValueOnce(null);
      const result = await (service as any).genUniqueCertNumber();
      expect(result).toBeTruthy();
      expect(prisma.certificate.findUnique).toHaveBeenCalledTimes(3);
    });

    it('throws após 5 colisões consecutivas (proteção contra RNG bug)', async () => {
      prisma.certificate.findUnique.mockResolvedValue({ id: 'always-collides' });
      await expect((service as any).genUniqueCertNumber()).rejects.toThrow(
        /Falha gerando certNumber único/,
      );
      expect(prisma.certificate.findUnique).toHaveBeenCalledTimes(5);
    });
  });

  describe('submitAttempt — atomicidade Cert + Attempt', () => {
    const baseQuiz = {
      id: 'quiz-1',
      slug: 'milhas-101',
      title: 'Milhas 101',
      passingScore: 70,
      isPublished: true,
      questions: [
        { id: 'q1', correctId: 'a' },
        { id: 'q2', correctId: 'b' },
      ],
    };

    it('retorna feedback sem cert quando user falha (score < passingScore)', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce(baseQuiz);
      prisma.quizAttempt.create.mockResolvedValueOnce({ id: 'att-1' });

      const result = await service.submitAttempt('user-1', 'milhas-101', {
        answers: [
          { questionId: 'q1', selectedId: 'b' }, // wrong
          { questionId: 'q2', selectedId: 'a' }, // wrong
        ],
      });

      expect(result.score).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.certificate).toBeNull();
      expect(prisma.certificate.create).not.toHaveBeenCalled();
    });

    it('cria Certificate + Attempt na mesma transação quando passa', async () => {
      prisma.quiz.findUnique.mockResolvedValueOnce(baseQuiz);
      prisma.user.findUnique.mockResolvedValueOnce({ name: 'Test User' });
      prisma.certificate.findUnique.mockResolvedValueOnce(null); // no collision
      prisma.certificate.create.mockResolvedValueOnce({
        id: 'cert-1',
        certNumber: 'MX-AAAA-BBBB-CCCC',
      });
      prisma.quizAttempt.create.mockResolvedValueOnce({ id: 'att-1' });

      const result = await service.submitAttempt('user-1', 'milhas-101', {
        answers: [
          { questionId: 'q1', selectedId: 'a' },
          { questionId: 'q2', selectedId: 'b' },
        ],
      });

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.certificate).toBeTruthy();
      expect(prisma.$transaction).toHaveBeenCalled();
      // Crucial: Cert + Attempt no mesmo $transaction call
      expect(prisma.certificate.create).toHaveBeenCalledTimes(1);
      expect(prisma.quizAttempt.create).toHaveBeenCalledTimes(1);
    });
  });
});
