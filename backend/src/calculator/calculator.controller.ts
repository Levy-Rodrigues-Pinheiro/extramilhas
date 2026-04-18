import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalculatorService } from './calculator.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { successResponse } from '../common/helpers/response.helper';

class CpmCalculatorDto {
  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0.01)
  amountBrl: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(1)
  milesQty: number;
}

class ReverseCalculatorDto {
  @ApiProperty({ example: 'GRU-MIA', description: 'IATA route pair, e.g. GRU-MIA' })
  @IsString()
  destination: string;

  @ApiProperty({ enum: ['economy', 'business', 'first'] })
  @IsIn(['economy', 'business', 'first'])
  class: 'economy' | 'business' | 'first';

  @ApiPropertyOptional({ example: 'smiles' })
  @IsOptional()
  @IsString()
  programSlug?: string;
}

@ApiTags('Calculator')
@UseGuards(JwtAuthGuard)
@Controller('calculator')
export class CalculatorController {
  constructor(private readonly calculatorService: CalculatorService) {}

  @Public()
  @Post('cpm')
  @ApiOperation({ summary: 'Calculate CPM (cost per thousand miles)' })
  @ApiBody({ type: CpmCalculatorDto })
  async calculateCpm(@Body() body: CpmCalculatorDto) {
    const result = await this.calculatorService.calculateCpm(
      body.amountBrl,
      body.milesQty,
    );
    return successResponse(result);
  }

  @Public()
  @Post('compare-value')
  @ApiOperation({ summary: 'Compare miles value vs cash price' })
  async compareValue(@Body() body: { milesRequired: number; cpmProgram: number; cashPriceBrl: number }) {
    const result = this.calculatorService.compareValue(body.milesRequired, body.cpmProgram, body.cashPriceBrl);
    return successResponse(result);
  }

  @Public()
  @Post('reverse')
  @ApiOperation({ summary: 'Reverse calculate: miles and BRL cost for a destination' })
  @ApiBody({ type: ReverseCalculatorDto })
  async reverseCalculate(@Body() body: ReverseCalculatorDto) {
    const result = await this.calculatorService.reverseCalculate(
      body.destination,
      body.class,
      body.programSlug,
    );
    return successResponse(result);
  }
}
