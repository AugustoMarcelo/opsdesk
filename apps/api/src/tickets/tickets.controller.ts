import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Post()
  async createTicket(
    @Body() body: CreateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createTicket({
      title: body.title,
      description: body.description,
      userId: req.user.id,
    });
  }

  @Get()
  list() {
    return this.service.listTickets();
  }
}
