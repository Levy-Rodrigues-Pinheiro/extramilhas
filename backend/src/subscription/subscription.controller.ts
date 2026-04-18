import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';

class CheckoutDto {
  @ApiProperty({ enum: ['PREMIUM', 'PRO'] })
  @IsNotEmpty()
  @IsIn(['PREMIUM', 'PRO'])
  plan: 'PREMIUM' | 'PRO';

  @ApiProperty({ enum: ['monthly', 'annual'] })
  @IsNotEmpty()
  @IsIn(['monthly', 'annual'])
  period: 'monthly' | 'annual';
}

@ApiTags('Subscription')
@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my subscription info' })
  async getSubscription(@CurrentUser() user: any) {
    const result = await this.subscriptionService.getSubscription(user.id);
    return successResponse(result);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a checkout session' })
  @ApiBody({ type: CheckoutDto })
  async createCheckout(@CurrentUser() user: any, @Body() body: CheckoutDto) {
    const result = await this.subscriptionService.createCheckoutSession(
      user.id,
      body.plan,
      body.period,
    );
    return successResponse(result);
  }

  @Post('cancel')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription (downgrade to FREE)' })
  async cancelSubscription(@CurrentUser() user: any) {
    const result = await this.subscriptionService.cancelSubscription(user.id);
    return successResponse(result);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint (raw body)' })
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const payload = req.rawBody;
    if (!payload) {
      throw new BadRequestException('Raw body not available');
    }
    const result = await this.subscriptionService.handleWebhook(payload, signature ?? '');
    return successResponse(result);
  }
}
