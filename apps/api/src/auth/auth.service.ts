import { DatabaseService } from './../db/database.service';
import { UsersRepository } from './../users/users.repository';
import { rolePermissions } from './../db/schema/role-permissions';
import { permissions } from './../db/schema/permissions';
import { eq, inArray } from 'drizzle-orm';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { userRoles, roles } from '../db/schema';
import { compare } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly databaseService: DatabaseService,
    private readonly usersRepo: UsersRepository,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersRepo.findByEmail(
      this.databaseService.db,
      email,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const currentUserRoles = await this.databaseService.db
      .select({
        roleId: roles.id,
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    const currentUserPermissions = await this.databaseService.db
      .select({
        permissionName: permissions.name,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        inArray(
          rolePermissions.roleId,
          currentUserRoles.map((r) => r.roleId),
        ),
      );

    return {
      accessToken: this.jwt.sign({
        sub: user.id,
        email: user.email,
        roles: currentUserRoles.map((r) => r.roleName),
        permissions: currentUserPermissions.map((p) => p.permissionName),
      }),
    };
  }
}
