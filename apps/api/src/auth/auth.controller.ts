import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { KeycloakCallbackDto } from './dto/keycloak-callback.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

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
}
