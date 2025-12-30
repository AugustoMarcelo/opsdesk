import 'dotenv/config'
import amqp, { type ConsumeMessage } from 'amqplib'
import { TicketCreatedEvent } from '../../../libs/events/ticket-created.event'

const EXCHANGE = 'opsdesk.events'
const QUEUE = 'ticket.created.queue'
const ROUTING_KEY = 'ticket.created'
const DLQ = 'tickets.created.dlq'

async function bootstrap(): Promise<void> {
  const url = process.env.RABBITMQ_URL

  if (!url) {
    throw new Error('RABBITMQ_URL is not defined')
  }

  const connection = await amqp.connect(url)
  const channel = await connection.createChannel()

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true })
  await channel.assertQueue(QUEUE, {
    durable: true,
    deadLetterExchange: '',
    deadLetterRoutingKey: DLQ,
  })
  await channel.assertQueue(DLQ, { durable: true })
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY)

  console.log('📥 Worker listening for ticket.created');

  channel.consume(QUEUE, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString()) as TicketCreatedEvent

      await handleTicketCreated(payload)

      channel.ack(msg)
    } catch (error) {
      console.log(error);
    }
  }, { noAck: false })
}

async function handleTicketCreated(event: TicketCreatedEvent): Promise<void> {
  console.log('🎫 Ticket created:', event.payload.id);

  // Aqui entram:
  // - envio de e-mail
  // - auditoria
  // - integração externa
  // - métricas
}

bootstrap().catch(console.error)