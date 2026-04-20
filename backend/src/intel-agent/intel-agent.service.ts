import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LlmExtractor, ExtractedBonus } from './llm-extractor.service';
import { TelegramAdapter } from './telegram-adapter.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cheerio: typeof import('cheerio') = require('cheerio');

/**
 * IntelAgentService — orquestrador dos crawlers automáticos.
 *
 * Pipeline por fonte:
 *   1. Fetch HTML (com timeout + UA decente pra evitar bloqueio)
 *   2. Cheerio extrai só o trecho em scopeSelector (se definido)
 *   3. Pré-filtro local de keywords (reduz 80% dos calls LLM)
 *   4. LLM estrutura bônus ativos
 *   5. Dedupe contra BonusReport dos últimos 7d
 *   6. Insere restante como reporterId=null + status=PENDING
 *
 * Rodagem:
 *   - Cron @every 2h varre todas fontes ativas respeitando minIntervalMin
 *   - Admin pode forçar via POST /admin/intel-agent/run/:id
 *
 * Custos monitorados: cada IntelAgentRun grava costUsd. IntelSource acumula
 * costUsd total. Admin vê gastos.
 */
@Injectable()
export class IntelAgentService {
  private readonly logger = new Logger(IntelAgentService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LlmExtractor,
    private telegram: TelegramAdapter,
  ) {}

  private isEnabled(): boolean {
    const flag = process.env.INTEL_AGENT_ENABLED;
    if (flag === 'false') return false;
    if (flag === 'true') return true;
    return process.env.NODE_ENV === 'production';
  }

  /** Cron: varre todas fontes a cada 2h, respeita minIntervalMin. */
  @Cron('0 */2 * * *')
  async runScheduled() {
    if (!this.isEnabled()) {
      this.logger.log('IntelAgent disabled');
      return;
    }
    await this.runAll();
  }

  async runAll() {
    const sources = (await (this.prisma as any).intelSource.findMany({
      where: { isActive: true },
    })) as any[];

    this.logger.log(`IntelAgent: varrendo ${sources.length} fontes ativas`);

    const results: any[] = [];
    for (const source of sources) {
      // Respeita minIntervalMin — pula se rodou muito recente
      if (source.lastRunAt) {
        const minutesSince = (Date.now() - new Date(source.lastRunAt).getTime()) / 60000;
        if (minutesSince < source.minIntervalMin) {
          this.logger.debug(
            `Skipping ${source.name} (last run ${minutesSince.toFixed(0)}min ago, interval=${source.minIntervalMin})`,
          );
          continue;
        }
      }
      try {
        const r = await this.runOne(source.id);
        results.push(r);
      } catch (err) {
        this.logger.error(`Source ${source.name} failed: ${(err as Error).message}`);
      }
    }
    const totalNew = results.reduce((s, r) => s + (r.newReportsCount || 0), 0);
    const totalCost = results.reduce((s, r) => s + (r.costUsd || 0), 0);
    this.logger.log(
      `IntelAgent sweep complete: ${results.length} sources, ${totalNew} new reports, $${totalCost.toFixed(4)} spent`,
    );
    return { runsCount: results.length, totalNew, totalCost };
  }

  /**
   * Roda um source específico. Usado pelo cron e pela rota admin manual.
   * Cria um IntelAgentRun e atualiza com métricas finais.
   */
  async runOne(sourceId: string) {
    const source = (await (this.prisma as any).intelSource.findUnique({
      where: { id: sourceId },
    })) as any;
    if (!source) throw new Error('Source não encontrado');

    const run = (await (this.prisma as any).intelAgentRun.create({
      data: {
        sourceId: source.id,
        status: 'running',
      },
    })) as any;

    try {
      let html: string;
      let text: string;

      // 1. Fetch — branch por sourceType (Feat C: Telegram adapter)
      if (source.sourceType === 'telegram') {
        const handle = source.url.startsWith('telegram:')
          ? source.url.slice('telegram:'.length).replace(/^@/, '')
          : source.url.replace(/^@/, '').replace(/^https?:\/\/t\.me\/s?\//, '');
        const telegramText = await this.telegram.fetchChannelText(handle);
        html = telegramText;
        text = telegramText; // já vem limpo
      } else {
        // HTML genérico
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15_000);
        const res = await fetch(source.url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; MilhasExtrasBot/1.0; +https://milhasextras.com.br/bot)',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          },
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();

        // 2. Cheerio scope
        let scoped = html;
        if (source.scopeSelector) {
          try {
            const $ = cheerio.load(html);
            const el = $(source.scopeSelector);
            scoped = el.length ? el.text() : $('body').text();
          } catch {
            /* fallback: html inteiro */
          }
        } else {
          const $ = cheerio.load(html);
          scoped = $('body').text();
        }
        text = scoped.replace(/\s+/g, ' ').trim();
      }

      // 3. Pre-filter
      if (!this.llm.hasRelevantKeywords(text)) {
        await (this.prisma as any).intelAgentRun.update({
          where: { id: run.id },
          data: {
            status: 'skipped',
            finishedAt: new Date(),
            htmlBytes: html.length,
            inputPreview: text.slice(0, 500),
            errorMessage: 'no relevant keywords',
          },
        });
        await (this.prisma as any).intelSource.update({
          where: { id: source.id },
          data: { lastRunAt: new Date() },
        });
        return { runId: run.id, status: 'skipped', newReportsCount: 0, costUsd: 0 };
      }

      // 4. LLM extract
      const extraction = await this.llm.extract(text);

      // 5. Dedupe + insert como BonusReport PENDING
      const newReportIds: string[] = [];
      const weekAgo = new Date(Date.now() - 7 * 86400_000);

      // Smart dedup intra-run: LLM pode extrair o MESMO bônus em 2 formatos
      // ("+100%" + "dobra pontos"). Colapsa por (from, to, bonus±5%) antes
      // de gastar queries no DB.
      const dedupedInRun: typeof extraction.bonuses = [];
      for (const b of extraction.bonuses) {
        const dup = dedupedInRun.find(
          (x) =>
            x.fromProgramSlug === b.fromProgramSlug &&
            x.toProgramSlug === b.toProgramSlug &&
            Math.abs(x.bonusPercent - b.bonusPercent) <= 5,
        );
        if (!dup) dedupedInRun.push(b);
      }
      if (dedupedInRun.length < extraction.bonuses.length) {
        this.logger.log(
          `Run-local dedup: ${extraction.bonuses.length} → ${dedupedInRun.length}`,
        );
      }

      for (const b of dedupedInRun) {
        // Dedup DB-wide: par igual + bônus dentro de tolerância ±5%
        // (agente pode extrair "99%" hoje e "100%" amanhã da mesma fonte)
        const existing = await this.prisma.bonusReport.findFirst({
          where: {
            fromProgramSlug: b.fromProgramSlug,
            toProgramSlug: b.toProgramSlug,
            bonusPercent: {
              gte: b.bonusPercent - 5,
              lte: b.bonusPercent + 5,
            },
            createdAt: { gte: weekAgo },
          },
        });
        if (existing) continue;

        const created = await this.prisma.bonusReport.create({
          data: {
            reporterId: null,
            reporterEmail: 'agent@milhasextras.com.br',
            fromProgramSlug: b.fromProgramSlug,
            toProgramSlug: b.toProgramSlug,
            bonusPercent: b.bonusPercent,
            expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
            notes: `🤖 Extraído automaticamente de: ${source.name}\n\n"${b.notes}"`,
            status: 'PENDING',
            intelSourceId: source.id, // permite calcular accuracy depois
          } as any,
        });
        newReportIds.push(created.id);
      }

      // 6. Finaliza run + atualiza source costUsd
      await (this.prisma as any).intelAgentRun.update({
        where: { id: run.id },
        data: {
          status: 'ok',
          finishedAt: new Date(),
          htmlBytes: html.length,
          extractedCount: extraction.bonuses.length,
          newReportsCount: newReportIds.length,
          costUsd: extraction.costUsd,
          inputPreview: text.slice(0, 500),
        },
      });
      await (this.prisma as any).intelSource.update({
        where: { id: source.id },
        data: {
          lastRunAt: new Date(),
          costUsd: { increment: extraction.costUsd },
        },
      });

      this.logger.log(
        `[${source.name}] extracted ${extraction.bonuses.length}, ${newReportIds.length} novos, $${extraction.costUsd.toFixed(4)}`,
      );
      return {
        runId: run.id,
        status: 'ok',
        extractedCount: extraction.bonuses.length,
        newReportsCount: newReportIds.length,
        costUsd: extraction.costUsd,
      };
    } catch (err) {
      const message = (err as Error).message;
      await (this.prisma as any).intelAgentRun.update({
        where: { id: run.id },
        data: {
          status: 'error',
          finishedAt: new Date(),
          errorMessage: message.slice(0, 500),
        },
      });
      this.logger.error(`[${source.name}] failed: ${message}`);
      throw err;
    }
  }

  async listSources() {
    const sources = await (this.prisma as any).intelSource.findMany({
      orderBy: [{ isActive: 'desc' }, { lastRunAt: 'desc' }],
    });

    // Enriquece com accuracy: approved/total de reports vindos dessa source
    const withStats = await Promise.all(
      sources.map(async (s: any) => {
        const [total, approved, rejected, pending] = await Promise.all([
          this.prisma.bonusReport.count({ where: { intelSourceId: s.id } as any }),
          this.prisma.bonusReport.count({
            where: { intelSourceId: s.id, status: 'APPROVED' } as any,
          }),
          this.prisma.bonusReport.count({
            where: { intelSourceId: s.id, status: 'REJECTED' } as any,
          }),
          this.prisma.bonusReport.count({
            where: { intelSourceId: s.id, status: 'PENDING' } as any,
          }),
        ]);
        const reviewed = approved + rejected;
        const accuracy = reviewed > 0 ? (approved / reviewed) * 100 : null;
        return {
          ...s,
          stats: {
            total,
            approved,
            rejected,
            pending,
            accuracyPercent: accuracy !== null ? parseFloat(accuracy.toFixed(1)) : null,
          },
        };
      }),
    );

    return withStats;
  }

  async getAgentSummary() {
    const [sources, totalReports, approvedFromAgent, rejectedFromAgent] =
      await Promise.all([
        (this.prisma as any).intelSource.findMany(),
        this.prisma.bonusReport.count({ where: { intelSourceId: { not: null } } as any }),
        this.prisma.bonusReport.count({
          where: { intelSourceId: { not: null }, status: 'APPROVED' } as any,
        }),
        this.prisma.bonusReport.count({
          where: { intelSourceId: { not: null }, status: 'REJECTED' } as any,
        }),
      ]);

    const reviewed = approvedFromAgent + rejectedFromAgent;
    const overallAccuracy = reviewed > 0 ? (approvedFromAgent / reviewed) * 100 : null;
    const totalCost = sources.reduce((s: number, x: any) => s + (x.costUsd ?? 0), 0);
    const activeCount = sources.filter((s: any) => s.isActive).length;

    return {
      sourcesTotal: sources.length,
      sourcesActive: activeCount,
      totalReportsFromAgent: totalReports,
      approvedFromAgent,
      rejectedFromAgent,
      overallAccuracyPercent:
        overallAccuracy !== null ? parseFloat(overallAccuracy.toFixed(1)) : null,
      totalCostUsd: parseFloat(totalCost.toFixed(4)),
      costPerApprovedUsd:
        approvedFromAgent > 0
          ? parseFloat((totalCost / approvedFromAgent).toFixed(4))
          : null,
    };
  }

  async listRecentRuns(limit = 50) {
    return (this.prisma as any).intelAgentRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { source: { select: { name: true, url: true } } },
    });
  }

  async upsertSource(data: {
    id?: string;
    name: string;
    url: string;
    sourceType?: string;
    scopeSelector?: string;
    isActive?: boolean;
    minIntervalMin?: number;
  }) {
    if (data.id) {
      return (this.prisma as any).intelSource.update({
        where: { id: data.id },
        data,
      });
    }
    return (this.prisma as any).intelSource.create({ data });
  }

  async deleteSource(id: string) {
    await (this.prisma as any).intelSource.delete({ where: { id } });
    return { deleted: true };
  }
}
