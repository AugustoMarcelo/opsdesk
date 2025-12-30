import {
  Body,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Param,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Tickets')
@Controller('/v1/tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @ApiOperation({ summary: 'Create ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  @Post()
  async createTicket(
    @Body() body: CreateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createTicket({
      title: body.title,
      description: body.description,
      // TODO: Replace with actual user ID from auth
      userId: req.user?.id || '00000000-0000-0000-0000-000000000000',
    });
  }

  @ApiOperation({ summary: 'List tickets' })
  @Get()
  async list(@Query() query: ListTicketsDto) {
    const tickets = await this.service.listTickets(query);

    return tickets;
  }

  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getTicketById(id);
  }
}
