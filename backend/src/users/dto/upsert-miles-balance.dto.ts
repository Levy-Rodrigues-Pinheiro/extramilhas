import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertMilesBalanceDto {
  @ApiProperty({ example: 'smiles-program-id', description: 'Loyalty program ID' })
  @IsString()
  programId: string;

  @ApiProperty({ example: 50000, description: 'Number of miles/points' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  balance: number;
}
