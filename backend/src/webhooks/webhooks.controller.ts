import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUrl, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { WebhooksService } from './webhooks.service';

class CreateWebhookDto {
  @ApiProperty()
  @IsString()
  @Length(3, 100)
  name!: string;
  @ApiProperty()
  @IsUrl()
  url!: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  events!: string[];
}

@ApiTags('Webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly svc: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: 'Meus webhooks (sem secret)' })
  async list(@CurrentUser() user: any) {
    const result = await this.svc.listMine(user.id);
    return successResponse(result);
  }

  @Post()
  @ApiOperation({ summary: 'Cria webhook (retorna secret só agora)' })
  async create(@CurrentUser() user: any, @Body() dto: CreateWebhookDto) {
    const result = await this.svc.create(user.id, dto);
    return successResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoga webhook (isActive=false)' })
  async revoke(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.svc.revoke(user.id, id);
    return successResponse(result);
  }
}
