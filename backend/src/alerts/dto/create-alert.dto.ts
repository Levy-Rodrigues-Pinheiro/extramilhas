import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { AlertType, NotificationChannel } from '../../common/enums';

export class CreateAlertDto {
  @ApiProperty({ enum: AlertType })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({
    description:
      'Conditions object. Shape depends on type: ' +
      'CPM_THRESHOLD: { programSlug, maxCpm } | ' +
      'DESTINATION: { origin, destination, maxMiles, class } | ' +
      'PROGRAM_PROMO: { programSlug }',
  })
  @IsObject()
  conditions: Record<string, any>;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    default: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[] = [NotificationChannel.PUSH, NotificationChannel.IN_APP];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
