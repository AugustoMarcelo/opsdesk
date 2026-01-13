import { UserResolver } from './user-resolver.service';
import { DatabaseModule } from './../db/database.module';
import { UsersModule } from './../users/users.module';
import { AuthorizationService } from './authorization.service';
import { KeycloakJwtAuthGuard } from './keycloak-jwt-auth.guard';
import { KeycloakJwtStrategy } from './keycloak-jwt.strategy';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '1h' },
    }),
    UsersModule,
    DatabaseModule,
  ],
  providers: [
    AuthService,
    AuthorizationService,
    KeycloakJwtStrategy,
    KeycloakJwtAuthGuard,
    UserResolver,
  ],
  controllers: [AuthController],
  exports: [KeycloakJwtAuthGuard, AuthorizationService],
})
export class AuthModule {}
