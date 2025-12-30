import { userRoles, rolePermissions, permissions } from '../db/schema';
import { db } from '../db/client';
import { eq } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthorizationService {
  async userHasPermission(
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    const rows = await db
      .select({
        name: permissions.name,
      })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    return rows.some((row) => row.name === permissionName);
  }
}
