import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
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
  Patch,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { KeycloakJwtAuthGuard } from '../auth/keycloak-jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Tickets')
@Controller('/v1/tickets')
@UseGuards(KeycloakJwtAuthGuard, PermissionsGuard)
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
      user: req.user,
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

  @ApiOperation({ summary: 'Update ticket title and description' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @Patch(':id')
  @Permissions(Perm.TicketUpdate)
  async updateTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.updateTicket(id, { ...body, user: req.user });
  }

  @ApiOperation({ summary: 'Update ticket status' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @Patch(':id/status')
  @Permissions(Perm.TicketClose)
  async updateTicketStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTicketStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.updateTicketStatus(id, { ...body, user: req.user });
  }
}
