import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SubscriptionPlan } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { createPaginatedResult, getPaginationSkip } from '../common/dto/pagination.dto';

export interface ArticleQueryDto {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateArticleDto {
  title: string;
  slug: string;
  body: string;
  category: string;
  isProOnly?: boolean;
  publishedAt?: Date;
}

export type UpdateArticleDto = Partial<CreateArticleDto>;

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async getArticles(query: ArticleQueryDto, userPlan?: SubscriptionPlan | null) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = getPaginationSkip(page, limit);

    const where: any = {};

    // FREE or unauthenticated users cannot see PRO-only articles
    if (!userPlan || userPlan !== SubscriptionPlan.PRO) {
      where.isProOnly = false;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { body: { contains: query.search } },
      ];
    }

    const [articles, total] = await Promise.all([
      this.prisma.contentArticle.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          isProOnly: true,
          publishedAt: true,
          createdAt: true,
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contentArticle.count({ where }),
    ]);

    return createPaginatedResult(articles, total, page, limit);
  }

  async getArticleBySlug(slug: string, userPlan?: SubscriptionPlan | null) {
    const article = await this.prisma.contentArticle.findUnique({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.isProOnly && (!userPlan || userPlan !== SubscriptionPlan.PRO)) {
      throw new ForbiddenException(
        'This article is available to PRO subscribers only. Upgrade to access it.',
      );
    }

    return article;
  }

  async createArticle(dto: CreateArticleDto) {
    return this.prisma.contentArticle.create({ data: dto });
  }

  async updateArticle(id: string, dto: UpdateArticleDto) {
    const article = await this.prisma.contentArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    return this.prisma.contentArticle.update({ where: { id }, data: dto });
  }

  async deleteArticle(id: string) {
    const article = await this.prisma.contentArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    await this.prisma.contentArticle.delete({ where: { id } });
    return { message: 'Article deleted successfully' };
  }
}
