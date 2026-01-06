import { IsEnum } from 'class-validator';

export class UpdateTicketStatusDto {
  @IsEnum(['open', 'closed'])
  status: 'open' | 'closed';
}
