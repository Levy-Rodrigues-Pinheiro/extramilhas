import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { QueryOffersDto } from './dto/query-offers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { successResponse } from '../common/helpers/response.helper';

@ApiTags('Offers')
@UseGuards(JwtAuthGuard)
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List offers with filters (free users see 1h delayed offers)' })
  async findAll(@Query() query: QueryOffersDto, @CurrentUser() user?: any) {
    const result = await this.offersService.findAll(query, user?.subscriptionPlan);
    return successResponse(result);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get top 5 featured offers' })
  async findFeatured(@CurrentUser() user?: any) {
    const result = await this.offersService.findFeatured(user?.subscriptionPlan);
    return successResponse(result);
  }

  @Public()
  @Get('explore')
  @ApiOperation({ summary: 'Get explore offers grouped by sections' })
  async getExploreOffers() {
    const result = await this.offersService.getExploreOffers();
    return successResponse(result);
  }

  @ApiBearerAuth()
  @Get('saved')
  @ApiOperation({ summary: 'Get my saved offers' })
  async getSaved(@CurrentUser() user: any, @Query() pagination: PaginationDto) {
    const result = await this.offersService.getSavedOffers(
      user.id,
      pagination.page || 1,
      pagination.limit || 20,
    );
    return successResponse(result);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get offer detail' })
  async findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    const result = await this.offersService.findOne(id, user?.subscriptionPlan);
    return successResponse(result);
  }

  @ApiBearerAuth()
  @Post(':id/save')
  @ApiOperation({ summary: 'Save offer to favorites' })
  async saveOffer(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.offersService.saveOffer(user.id, id);
    return successResponse(result);
  }

  @ApiBearerAuth()
  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove offer from favorites' })
  async unsaveOffer(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.offersService.unsaveOffer(user.id, id);
    return successResponse(result);
  }
}
