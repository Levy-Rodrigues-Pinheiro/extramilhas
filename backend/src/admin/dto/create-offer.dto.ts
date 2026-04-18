import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsPositive,
  IsUrl,
  IsDateString,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { OfferType, OfferClassification } from '../../common/enums';

export class CreateOfferDto {
  @ApiProperty({ description: 'LoyaltyProgram UUID' })
  @IsString()
  programId: string;

  @ApiProperty({ enum: OfferType })
  @IsEnum(OfferType)
  type: OfferType;

  @ApiProperty({ minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Cost per thousand miles (CPM) in BRL', example: 25.5 })
  @IsNumber()
  @IsPositive()
  cpm: number;

  @ApiPropertyOptional({
    enum: OfferClassification,
    description: 'Auto-calculated from CPM if not provided',
  })
  @IsOptional()
  @IsEnum(OfferClassification)
  classification?: OfferClassification;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  affiliateUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Arbitrary metadata object' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
