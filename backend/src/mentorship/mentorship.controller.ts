import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { MentorshipService } from './mentorship.service';

class UpsertProfileDto {
  @ApiProperty({ enum: ['MENTOR', 'MENTEE', 'BOTH'] })
  @IsIn(['MENTOR', 'MENTEE', 'BOTH'])
  role!: string;
  @ApiProperty()
  @IsString()
  @Length(3, 200)
  expertise!: string;
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  experience!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  interests?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  hoursPerWeek?: number;
}

class RequestMentorshipDto {
  @ApiProperty()
  @IsString()
  @Length(20, 1000)
  message!: string;
}

class RespondDto {
  @ApiProperty({ enum: ['ACCEPT', 'DECLINE'] })
  @IsIn(['ACCEPT', 'DECLINE'])
  decision!: 'ACCEPT' | 'DECLINE';
}

@ApiTags('Mentorship')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('mentorship')
export class MentorshipController {
  constructor(private readonly svc: MentorshipService) {}

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cria/atualiza meu perfil de mentoria' })
  async upsertProfile(@CurrentUser() user: any, @Body() dto: UpsertProfileDto) {
    const result = await this.svc.upsertProfile(user.id, dto);
    return successResponse(result);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Meu perfil de mentoria' })
  async myProfile(@CurrentUser() user: any) {
    const result = await this.svc.getMyProfile(user.id);
    return successResponse(result);
  }

  @Get('mentors')
  @ApiOperation({ summary: 'Lista mentores (filtrável por interesses CSV)' })
  async findMentors(@Query('interests') interestsRaw?: string) {
    const interests = interestsRaw
      ? interestsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const result = await this.svc.findMentors({ interests });
    return successResponse(result);
  }

  @Post('requests/:mentorId')
  @ApiOperation({ summary: 'Pede mentoria pra um mentor' })
  async requestMentorship(
    @CurrentUser() user: any,
    @Param('mentorId') mentorId: string,
    @Body() dto: RequestMentorshipDto,
  ) {
    const result = await this.svc.requestMentorship(user.id, mentorId, dto.message);
    return successResponse(result);
  }

  @Post('requests/:requestId/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mentor aceita ou recusa pedido' })
  async respond(
    @CurrentUser() user: any,
    @Param('requestId') requestId: string,
    @Body() dto: RespondDto,
  ) {
    const result = await this.svc.respondToRequest(user.id, requestId, dto.decision);
    return successResponse(result);
  }

  @Get('requests/mine')
  @ApiOperation({ summary: 'Meus requests (como mentor e como mentee)' })
  async myRequests(@CurrentUser() user: any) {
    const result = await this.svc.myRequests(user.id);
    return successResponse(result);
  }
}
