import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/helpers/response.helper';
import { PublicProfileService } from './public-profile.service';

class SetUsernameDto {
  @ApiProperty()
  @IsString()
  @Length(3, 30)
  username!: string;
}

class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLeaderboard?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showGuides?: boolean;
}

@ApiTags('Public Profile')
@Controller('u')
export class PublicProfileController {
  constructor(private readonly svc: PublicProfileService) {}

  @Public()
  @Get(':username')
  @ApiOperation({ summary: 'Perfil público por username (SEO-friendly)' })
  async getByUsername(@Param('username') username: string) {
    const result = await this.svc.getByUsername(username);
    return successResponse(result);
  }

  @Put('me/username')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Define ou muda meu username público' })
  async setUsername(@CurrentUser() user: any, @Body() dto: SetUsernameDto) {
    const result = await this.svc.setUsername(user.id, dto.username);
    return successResponse({ publicUsername: result.publicUsername });
  }

  @Put('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualiza bio/avatar/visibilidade do perfil público' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    const result = await this.svc.updateProfile(user.id, dto);
    return successResponse({
      publicBio: result.publicBio,
      publicAvatarUrl: result.publicAvatarUrl,
      publicShowLeaderboard: result.publicShowLeaderboard,
      publicShowGuides: result.publicShowGuides,
    });
  }
}
