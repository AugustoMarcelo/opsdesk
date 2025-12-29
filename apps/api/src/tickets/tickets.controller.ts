import { Body, Controller, Post } from '@nestjs/common';
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
}
