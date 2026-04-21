import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  private genCertNumber(): string {
    // Formato MX-XXXX-YYYY-ZZZZ (6 bytes = ~281T combos, colisão negligible).
    // Bug fix HONEST_TEST_REPORT #13: antes era 4 bytes (~4B), teoricamente
    // colidível em 1M certs. Agora + retry loop em genUniqueCertNumber().
    const p1 = randomBytes(2).toString('hex').toUpperCase();
    const p2 = randomBytes(2).toString('hex').toUpperCase();
    const p3 = randomBytes(2).toString('hex').toUpperCase();
    return `MX-${p1}-${p2}-${p3}`;
  }

  /**
   * Gera certNumber garantidamente único com retry de até 5 tentativas.
   * Em prática só 1 iteração — 5+ colisões consecutivas indicariam RNG bug.
   */
  private async genUniqueCertNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const candidate = this.genCertNumber();
      const existing = await (this.prisma as any).certificate.findUnique({
        where: { certNumber: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
    }
    throw new Error('Falha gerando certNumber único após 5 tentativas');
  }

  async listPublished() {
    return (this.prisma as any).quiz.findMany({
      where: { isPublished: true },
      orderBy: [{ level: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { questions: true } },
      },
    });
  }

  async getQuizForTaking(userId: string, slug: string) {
    const quiz = await (this.prisma as any).quiz.findUnique({
      where: { slug },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            orderIndex: true,
            question: true,
            options: true,
          },
        },
      },
    });
    if (!quiz || !quiz.isPublished) throw new NotFoundException('Quiz não disponível');

    if (quiz.premiumOnly) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionPlan: true },
      });
      if (user?.subscriptionPlan === 'FREE') {
        throw new ForbiddenException('Quiz exclusivo Premium');
      }
    }

    // Stripa correctId pro user — só retorna na submissão
    return {
      ...quiz,
      questions: quiz.questions.map((q: any) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        question: q.question,
        options: (() => {
          try {
            return JSON.parse(q.options);
          } catch {
            return [];
          }
        })(),
      })),
    };
  }

  async submitAttempt(
    userId: string,
    slug: string,
    params: { answers: Array<{ questionId: string; selectedId: string }>; timeSpentMs?: number },
  ) {
    const quiz = await (this.prisma as any).quiz.findUnique({
      where: { slug },
      include: { questions: true },
    });
    if (!quiz || !quiz.isPublished) throw new NotFoundException('Quiz não disponível');

    // Avalia
    const byId = new Map(quiz.questions.map((q: any) => [q.id, q]));
    const graded = params.answers.map((a) => {
      const q: any = byId.get(a.questionId);
      if (!q) return { ...a, correct: false };
      return { ...a, correct: q.correctId === a.selectedId };
    });
    const correctCount = graded.filter((g) => g.correct).length;
    const score = quiz.questions.length > 0
      ? Math.round((correctCount / quiz.questions.length) * 100)
      : 0;
    const passed = score >= quiz.passingScore;

    let certificateId: string | null = null;
    let certificate: any = null;
    if (passed) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        certificate = await (this.prisma as any).certificate.create({
          data: {
            userId,
            quizSlug: quiz.slug,
            quizTitle: quiz.title,
            certNumber: await this.genUniqueCertNumber(),
            score,
            holderName: user.name,
          },
        });
        certificateId = certificate.id;
      }
    }

    const attempt = await (this.prisma as any).quizAttempt.create({
      data: {
        userId,
        quizId: quiz.id,
        answers: JSON.stringify(graded),
        score,
        passed,
        certificateId,
        timeSpentMs: params.timeSpentMs ?? 0,
      },
    });

    // Return graded com explicações pra feedback
    const feedback = quiz.questions.map((q: any) => {
      const given = graded.find((g: any) => g.questionId === q.id);
      return {
        questionId: q.id,
        correct: given?.correct ?? false,
        correctId: q.correctId,
        explanation: q.explanation,
      };
    });

    return {
      attemptId: attempt.id,
      score,
      passed,
      passingScore: quiz.passingScore,
      correctCount,
      totalQuestions: quiz.questions.length,
      certificate,
      feedback,
    };
  }

  async myCertificates(userId: string) {
    return (this.prisma as any).certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getCertificateByNumber(certNumber: string) {
    const cert = await (this.prisma as any).certificate.findUnique({
      where: { certNumber: certNumber.toUpperCase() },
    });
    if (!cert) throw new NotFoundException('Certificado não encontrado');
    return cert;
  }
}
