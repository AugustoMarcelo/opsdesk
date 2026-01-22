import { io } from 'socket.io-client';

const TOKEN = process.env.TOKEN;
const TICKET_ID = process.env.TICKET_ID;

if (!TOKEN || !TICKET_ID) {
  console.error('Set TOKEN and TICKET_ID env vars');
  process.exit(1);
}

const socket = io('http://localhost:3002', {
  auth: { token: TOKEN },
});

socket.on('connect', () => {
  console.log('connected: ', socket.id);
  socket.emit('ticket.join', TICKET_ID);
  console.log('sent ticket.join: ', TICKET_ID);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

socket.on('message:new', (data) => {
  console.log('message:new', data);
});

socket.on('ticket:statusChanged', (data) => {
  console.log('ticket:statusChanged', data);
});
