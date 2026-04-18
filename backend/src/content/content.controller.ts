import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan } from '../common/enums';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';

@ApiTags('Content')
@UseGuards(JwtAuthGuard)
@Controller('content')
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    @Optional() private readonly jwtService: JwtService,
    @Optional() private readonly configService: ConfigService,
  ) {}

  /**
   * Extract user plan from the Authorization header without hard-failing
   * when no token is present (route is @Public).
   */
  private extractPlanFromRequest(req: any): SubscriptionPlan | null {
    try {
      const authHeader: string | undefined = req.headers?.authorization;
      if (!authHeader?.startsWith('Bearer ')) return null;

      const token = authHeader.split(' ')[1];
      const secret = this.configService?.get<string>('jwt.secret') ?? process.env.JWT_SECRET;
      const payload = this.jwtService?.verify(token, { secret });
      return payload?.subscriptionPlan ?? null;
    } catch {
      return null;
    }
  }

  @Public()
  @Get('articles')
  @ApiOperation({
    summary:
      'List articles. FREE/unauthenticated users see only public articles; PRO users see all.',
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getArticles(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userPlan = this.extractPlanFromRequest(req);
    const result = await this.contentService.getArticles(
      {
        category,
        search,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      },
      userPlan,
    );
    return successResponse(result);
  }

  @Public()
  @Get('articles/:slug')
  @ApiOperation({
    summary: 'Article detail. PRO-only articles require PRO plan.',
  })
  async getArticle(@Param('slug') slug: string, @Request() req: any) {
    const userPlan = this.extractPlanFromRequest(req);
    const result = await this.contentService.getArticleBySlug(slug, userPlan);
    return successResponse(result);
  }
}
