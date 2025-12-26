import { users, tickets, ticketHistory } from './schema';

type _Check = typeof users & typeof tickets & typeof ticketHistory;
