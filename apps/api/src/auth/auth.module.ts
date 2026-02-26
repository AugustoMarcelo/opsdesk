import { AuthStrategyProvider } from './auth-strategy.provider';
import { UserResolver } from './user-resolver.service';
import { DatabaseModule } from './../db/database.module';
import { UsersModule } from './../users/users.module';
import { AuthorizationService } from './authorization.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

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
    AuthStrategyProvider,
    UserResolver,
    JwtAuthGuard,
    PermissionsGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  controllers: [AuthController],
  exports: [AuthorizationService],
})
export class AuthModule {}
