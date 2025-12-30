import { PermissionsGuard } from './../auth/guards/permissions.guard';
import { Permissions } from './../auth/decorators/permissions.decorator';
import { Permissions as Perm } from '../../../../packages/shared/permissions';
import {
  Body,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Tickets')
@Controller('/v1/tickets')
@UseGuards(PermissionsGuard)
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @ApiOperation({ summary: 'Create ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  @Post()
  @Permissions(Perm.TicketCreate)
  async createTicket(
    @Body() body: CreateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.createTicket({
      title: body.title,
      description: body.description,
      userId: req.user?.id,
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
  @Permissions(Perm.TicketRead)
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.getTicketById(id, req.user);
  }
}
