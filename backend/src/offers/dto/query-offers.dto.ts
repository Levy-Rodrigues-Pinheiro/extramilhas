import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OfferClassification, OfferType } from '../../common/enums';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryOffersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by loyalty program ID' })
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiPropertyOptional({ enum: OfferType })
  @IsOptional()
  @IsEnum(OfferType)
  type?: OfferType;

  @ApiPropertyOptional({ enum: OfferClassification })
  @IsOptional()
  @IsEnum(OfferClassification)
  classification?: OfferClassification;

  @ApiPropertyOptional({ description: 'Maximum CPM value' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCpm?: number;

  @ApiPropertyOptional({ description: 'Minimum CPM value' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minCpm?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search in title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['cpm', 'createdAt', 'expiresAt'] })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
