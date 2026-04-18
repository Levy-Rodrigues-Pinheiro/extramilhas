import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsInt, Min } from 'class-validator';
import { SimulatorService } from './simulator.service';
import { FlightSearchService } from './flight-search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { successResponse } from '../common/helpers/response.helper';

class SimulateDestinationsDto {
  @ApiProperty({ example: 60000 })
  @IsNumber()
  @Min(1)
  milesQty: number;

  @ApiProperty({ example: 'smiles' })
  @IsString()
  programSlug: string;

  @ApiProperty({ example: 'economy', description: 'economy | business | first' })
  @IsString()
  class: string;

  @ApiPropertyOptional({ example: 'GRU', description: 'Origin IATA code (default: GRU)' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ example: 1, description: 'Maximum number of stops (0 = direct only)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStops?: number;
}

@ApiTags('Simulator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('simulator')
export class SimulatorController {
  constructor(
    private readonly simulatorService: SimulatorService,
    private readonly flightSearchService: FlightSearchService,
  ) {}

  @Public()
  @Get('destinations-map')
  @ApiOperation({ summary: 'Get destinations map with reachability' })
  async getDestinationsMap(
    @Query('miles') miles: number,
    @Query('programSlug') programSlug: string,
    @Query('class') flightClass: string,
  ) {
    const result = await this.simulatorService.getDestinationsMap(+miles, programSlug, flightClass || 'economy');
    return successResponse(result);
  }

  @Post('destinations')
  @ApiOperation({ summary: 'Simulate possible destinations based on miles balance' })
  @ApiBody({ type: SimulateDestinationsDto })
  async simulateDestinations(@Body() body: SimulateDestinationsDto) {
    const result = await this.simulatorService.simulateDestinations(
      body.milesQty,
      body.programSlug,
      body.class,
      body.maxStops,
      body.origin,
    );
    return successResponse(result);
  }

  @Public()
  @Post('search-flights')
  @ApiOperation({ summary: 'Search flights comparing miles across programs with cash price estimation' })
  async searchFlights(@Body() body: {
    origin: string;
    destination: string;
    departDate: string;
    returnDate?: string;
    cabinClass?: string;
    passengers?: number;
    programSlug?: string;
  }) {
    const result = await this.flightSearchService.searchFlights({
      origin: body.origin,
      destination: body.destination,
      departDate: body.departDate,
      returnDate: body.returnDate,
      cabinClass: body.cabinClass || 'economy',
      passengers: body.passengers || 1,
      programSlug: body.programSlug,
    });
    return successResponse(result);
  }
}
