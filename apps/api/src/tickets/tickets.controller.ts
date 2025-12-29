import { Body, Controller, Get, Post } from '@nestjs/common';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Post()
  async createTicket(@Body() body: any) {
    return this.service.createTicket({
      title: body.title,
      description: body.description,
      userId: body.userId,
    });
  }

  @Get()
  list() {
    return this.service.listTickets();
  }
}
