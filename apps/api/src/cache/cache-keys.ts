/**
 * Cache key generation utilities
 * Centralizes all cache key patterns for consistency and easier maintenance
 */

export class CacheKeys {
  /**
   * User permissions cache key
   */
  static userPermissions(userId: string): string {
    return `user:${userId}:permissions`;
  }

  /**
   * Tickets list cache key with query parameters
   */
  static ticketsList(params: {
    offset?: number;
    limit?: number;
    order?: string;
    status?: string;
    userId?: string;
  }): string {
    const parts = ['tickets:list'];

    if (params.status) parts.push(`status:${params.status}`);
    if (params.userId) parts.push(`user:${params.userId}`);
    if (params.offset !== undefined) parts.push(`offset:${params.offset}`);
    if (params.limit !== undefined) parts.push(`limit:${params.limit}`);
    if (params.order) parts.push(`order:${params.order}`);

    return parts.join(':');
  }

  /**
   * Pattern to invalidate all ticket list caches
   */
  static ticketsListPattern(): string {
    return 'tickets:list*';
  }

  /**
   * Single ticket cache key
   */
  static ticket(ticketId: string): string {
    return `ticket:${ticketId}`;
  }
}
