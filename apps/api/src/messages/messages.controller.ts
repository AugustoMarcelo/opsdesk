import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permissions as Perm } from '../../../../packages/shared/permissions';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@ApiTags('Messages')
@Controller('/v1/messages')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @ApiOperation({ summary: 'Send a message to a ticket' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @Post()
  @Permissions(Perm.MessageSend)
  async createMessage(
    @Body() body: CreateMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createMessage({
      ticketId: body.ticketId,
      content: body.content,
      authorId: req.user.id,
    });
  }
}
