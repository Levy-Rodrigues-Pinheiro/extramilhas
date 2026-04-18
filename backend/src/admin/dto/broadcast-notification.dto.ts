import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { SubscriptionPlan } from '../../common/enums';

export class BroadcastNotificationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiPropertyOptional({
    enum: ['ALL', 'FREE', 'PREMIUM', 'PRO'],
    default: 'ALL',
    description: 'Target plan. Use ALL to broadcast to every user.',
  })
  @IsOptional()
  @IsIn(['ALL', SubscriptionPlan.FREE, SubscriptionPlan.PREMIUM, SubscriptionPlan.PRO])
  targetPlan?: 'ALL' | SubscriptionPlan = 'ALL';
}
