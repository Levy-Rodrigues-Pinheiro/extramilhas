import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { TravelIntelService } from './travel-intel.service';

class StopoverDto {
  @ApiProperty()
  @IsString()
  origin!: string;
  @ApiProperty()
  @IsString()
  destination1!: string;
  @ApiProperty()
  @IsString()
  destination2!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  programId?: string;
}

class MileageRunDto {
  @ApiProperty()
  @IsString()
  programSlug!: string;
  @ApiProperty()
  @IsString()
  targetTier!: string;
  @ApiProperty()
  @IsInt()
  @Min(0)
  currentQualifyingMiles!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  avgFlightPriceBrl?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  avgFlightMiles?: number;
}

@ApiTags('Travel Intel')
@Controller('travel-intel')
export class TravelIntelController {
  constructor(private readonly svc: TravelIntelService) {}

  @Public()
  @Get('alliances')
  @ApiOperation({ summary: 'Lista das 3 alianças globais + parceiros' })
  async alliances() {
    const result = await this.svc.getAlliances();
    return successResponse(result);
  }

  @Public()
  @Get('alliances/program/:slug')
  @ApiOperation({ summary: 'Aliança do programa + lista de parceiros' })
  async allianceForProgram(@Param('slug') slug: string) {
    const result = await this.svc.getAllianceForProgram(slug);
    return successResponse(result);
  }

  @Post('stopover/analyze')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyzer stopover vs 2 emissões separadas' })
  async analyzeStopover(@Body() dto: StopoverDto) {
    const result = await this.svc.analyzeStopover(dto);
    return successResponse(result);
  }

  @Post('mileage-run/calc')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calcula mileage run: quantos voos + ROI vs benefícios tier' })
  async mileageRun(@Body() dto: MileageRunDto) {
    const result = await this.svc.calculateMileageRun(dto);
    return successResponse(result);
  }
}
