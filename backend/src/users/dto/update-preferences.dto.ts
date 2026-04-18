import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDecimal, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ type: [String], example: ['smiles', 'livelo'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredPrograms?: string[];

  @ApiPropertyOptional({ type: [String], example: ['GRU', 'GIG'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredOrigins?: string[];

  @ApiPropertyOptional({ type: [String], example: ['MIA', 'LIS', 'JFK'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredDestinations?: string[];

  @ApiPropertyOptional({ example: 25.0, description: 'Target CPM in BRL per 1000 miles' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  targetCpm?: number;
}
