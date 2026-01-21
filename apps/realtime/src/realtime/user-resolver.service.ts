import { Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { UsersRepository } from './users.repository';

export type KeycloakLikeUser = {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
};

@Injectable()
export class UserResolver {
  constructor(private readonly usersRepository: UsersRepository) {}

  async resolve(user: KeycloakLikeUser) {
    const existingUser = await this.usersRepository.findByExternalId(user.sub);
    if (existingUser) return existingUser;

    const passwordHash = await hash(new Date().getTime().toString(), 10);

    return this.usersRepository.create({
      externalId: user.sub,
      email: user.email,
      name: user.name ?? user.preferred_username ?? user.email,
      passwordHash,
    });
  }
}

