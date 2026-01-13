import { DatabaseService } from 'src/db/database.service';
import { KeycloakUser } from './keycloak-user.type';
import { UsersRepository } from './../users/users.repository';
import { Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';

@Injectable()
export class UserResolver {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async resolve(keycloakUser: KeycloakUser) {
    const existingUser = await this.usersRepository.findByExternalId(
      this.databaseService.db,
      keycloakUser.sub,
    );

    if (existingUser) return existingUser;

    const passwordHash = await hash(new Date().getTime().toString(), 10);

    const createdUser = await this.usersRepository.create(
      this.databaseService.db,
      {
        externalId: keycloakUser.sub,
        email: keycloakUser.email,
        name:
          keycloakUser.name ??
          keycloakUser.preferred_username ??
          keycloakUser.email,
        password: passwordHash,
      },
    );

    return createdUser;
  }
}
