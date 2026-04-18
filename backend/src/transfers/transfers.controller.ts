import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/helpers/response.helper';

@ApiTags('transfers')
@Controller('transfers')
export class TransfersController {
  constructor(private service: TransfersService) {}

  @Public()
  @Get('partnerships')
  async getPartnerships() {
    const result = await this.service.getPartnerships();
    return successResponse(result);
  }

  @Public()
  @Post('calculate')
  async calculate(@Body() body: { fromProgramId: string; toProgramId: string; points: number }) {
    const result = await this.service.calculate(body.fromProgramId, body.toProgramId, body.points);
    return successResponse(result);
  }
}
