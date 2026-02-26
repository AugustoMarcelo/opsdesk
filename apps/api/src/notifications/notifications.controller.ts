import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permissions as Perm } from '../../../../packages/shared/permissions';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@ApiTags('Notifications')
@Controller('/v1/notifications')
@Permissions(Perm.TicketRead)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @ApiOperation({ summary: 'List unread notifications' })
  @ApiResponse({ status: 200, description: 'List of unread notifications' })
  @Get()
  async listUnread(@Req() req: AuthenticatedRequest) {
    return this.service.listUnread(req.user.id);
  }

  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  @Get('unread')
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    const count = await this.service.getUnreadCount(req.user.id);
    return { count };
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Marked all as read' })
  @Post('mark-all-read')
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    await this.service.markAllAsRead(req.user.id);
    return { success: true };
  }

  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.service.markAsRead(req.user.id, id);
    return { success: true };
  }
}
