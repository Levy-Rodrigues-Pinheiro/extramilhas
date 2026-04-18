import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export enum SocialProvider {
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}

export class SocialAuthDto {
  @ApiProperty({ enum: SocialProvider, example: SocialProvider.GOOGLE })
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @ApiProperty({ description: 'OAuth token from the provider' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'joao@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
