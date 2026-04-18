import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/helpers/response.helper';

@ApiTags('Programs')
@UseGuards(JwtAuthGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all active loyalty programs' })
  async findAll() {
    const result = await this.programsService.findAll();
    return successResponse(result);
  }

  @Public()
  @Get('compare')
  @ApiOperation({ summary: 'Compare multiple programs' })
  @ApiQuery({ name: 'ids', type: [String], required: true, description: 'Program IDs to compare' })
  async compare(@Query('ids') ids: string | string[]) {
    const idsArray = Array.isArray(ids) ? ids : [ids];
    const result = await this.programsService.comparePrograms(idsArray);
    return successResponse(result);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get program detail with current CPM' })
  async findOne(@Param('id') id: string) {
    const result = await this.programsService.findOne(id);
    return successResponse(result);
  }

  @Public()
  @Get(':id/prediction')
  @ApiOperation({ summary: 'Get CPM prediction for a program' })
  async getPrediction(@Param('id') id: string) {
    const result = await this.programsService.getPrediction(id);
    return successResponse(result);
  }

  @Public()
  @Get(':id/price-history')
  @ApiOperation({ summary: 'Get program CPM price history' })
  @ApiQuery({
    name: 'range',
    enum: ['7d', '30d', '90d', '1y', 'all'],
    required: false,
    description: 'Date range for history',
  })
  async getPriceHistory(@Param('id') id: string, @Query('range') range?: string) {
    const result = await this.programsService.getPriceHistory(id, range);
    return successResponse(result);
  }
}
