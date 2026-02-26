import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permissions as Perm } from '../../../../packages/shared/permissions';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@ApiTags('Messages')
@Controller('/v1/messages')
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
