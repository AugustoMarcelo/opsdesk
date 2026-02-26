import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service';
import { userNotifications } from '../db/schema/user-notifications';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listUnread(userId: string, limit = 20) {
    const items = await this.databaseService.db
      .select({
        id: userNotifications.id,
        ticketId: userNotifications.ticketId,
        type: userNotifications.type,
        createdAt: userNotifications.createdAt,
      })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          isNull(userNotifications.readAt),
        ),
      )
      .orderBy(desc(userNotifications.createdAt))
      .limit(limit);
    return { data: items };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [row] = await this.databaseService.db
      .select({ count: sql<number>`count(*)::int` })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          isNull(userNotifications.readAt),
        ),
      );
    return row?.count ?? 0;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.databaseService.db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(eq(userNotifications.userId, userId));
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.databaseService.db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(userNotifications.id, notificationId),
          eq(userNotifications.userId, userId),
        ),
      );
  }
}
