import { UsersRepository } from './users.repository';
import { DatabaseModule } from './../db/database.module';
import { KeycloakAdminModule } from './../auth/keycloak-admin.module';
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule, KeycloakAdminModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
