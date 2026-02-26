import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { KeycloakCallbackDto } from './dto/keycloak-callback.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './public.decorator';
import type { AuthenticatedRequest } from './authenticated-request';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return { id: req.user.id, email: req.user.email, roles: req.user.roles };
  }

  @Public()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.service.login(body.email, body.password);
  }

  @Public()
  @Post('keycloak-callback')
  keycloakCallback(@Body() body: KeycloakCallbackDto) {
    return this.service.keycloakCallback(body.code, body.redirect_uri);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.service.refresh(body.refreshToken);
  }
}
