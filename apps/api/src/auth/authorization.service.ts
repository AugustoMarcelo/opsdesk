import { userRoles, rolePermissions, permissions } from '../db/schema';
import { db } from '../db/client';
import { eq } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { redis } from '../cache/redis.client';
import { CacheKeys } from '../cache/cache-keys';

@Injectable()
export class AuthorizationService {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Get all permissions for a user (cached)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const cacheKey = CacheKeys.userPermissions(userId);

    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as string[];
    }

    // Query database
    const rows = await db
      .select({
        name: permissions.name,
      })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    const userPermissions = rows.map((row) => row.name);

    // Cache the result
    await redis.set(
      cacheKey,
      JSON.stringify(userPermissions),
      'EX',
      this.CACHE_TTL,
    );

    return userPermissions;
  }

  async userHasPermission(
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permissionName);
  }

  /**
   * Invalidate user permissions cache
   */
  async invalidateUserPermissions(userId: string): Promise<void> {
    const cacheKey = CacheKeys.userPermissions(userId);
    await redis.del(cacheKey);
  }
}
