import 'dotenv/config'
import amqp, { type ConsumeMessage } from 'amqplib'
import Redis from 'ioredis'
import { TicketCreatedEvent } from '../../../packages/events/ticket-created.event'
import { TicketStatusChangedEvent } from '../../../packages/events/ticket-status-changed.event'
import { TicketUpdatedEvent } from '../../../packages/events/ticket-updated.event'

const EXCHANGE = 'opsdesk.events'
const TICKET_CREATED_QUEUE = 'ticket.created.queue'
const TICKET_STATUS_CHANGED_QUEUE = 'ticket.status_changed.queue'
const TICKET_UPDATED_QUEUE = 'ticket.updated.queue'
const DLQ = 'tickets.created.dlq'

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
})

async function bootstrap(): Promise<void> {
  await connectWithRetry()
}

async function connectWithRetry(retries = 10) {
  while (retries > 0) {
    try {
      const url = process.env.RABBITMQ_URL

      if (!url) {
        throw new Error('RABBITMQ_URL is not defined')
      }

      const connection = await amqp.connect(url)
      const channel = await connection.createChannel()

      await channel.assertExchange(EXCHANGE, 'topic', { durable: true })
      
      // Setup ticket.created queue
      await channel.assertQueue(TICKET_CREATED_QUEUE, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: DLQ,
      })
      await channel.assertQueue(DLQ, { durable: true })
      await channel.bindQueue(TICKET_CREATED_QUEUE, EXCHANGE, 'ticket.created')

      // Setup ticket.status_changed queue
      await channel.assertQueue(TICKET_STATUS_CHANGED_QUEUE, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: DLQ,
      })
      await channel.bindQueue(TICKET_STATUS_CHANGED_QUEUE, EXCHANGE, 'ticket.status_changed')

      // Setup ticket.updated queue
      await channel.assertQueue(TICKET_UPDATED_QUEUE, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: DLQ,
      })
      await channel.bindQueue(TICKET_UPDATED_QUEUE, EXCHANGE, 'ticket.updated')

      console.log('📥 Worker listening for ticket events');

      // Consumer for ticket.created
      channel.consume(TICKET_CREATED_QUEUE, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const payload = JSON.parse(msg.content.toString()) as TicketCreatedEvent
          await handleTicketCreated(payload)
          channel.ack(msg)
        } catch (error) {
          console.log('Error handling ticket.created:', error);
          channel.nack(msg, false, false) // Send to DLQ
        }
      }, { noAck: false })

      // Consumer for ticket.status_changed
      channel.consume(TICKET_STATUS_CHANGED_QUEUE, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const payload = JSON.parse(msg.content.toString()) as TicketStatusChangedEvent
          await handleTicketStatusChanged(payload)
          channel.ack(msg)
        } catch (error) {
          console.log('Error handling ticket.status_changed:', error);
          channel.nack(msg, false, false) // Send to DLQ
        }
      }, { noAck: false })

      // Consumer for ticket.updated
      channel.consume(TICKET_UPDATED_QUEUE, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const payload = JSON.parse(msg.content.toString()) as TicketUpdatedEvent
          await handleTicketUpdated(payload)
          channel.ack(msg)
        } catch (error) {
          console.log('Error handling ticket.updated:', error);
          channel.nack(msg, false, false) // Send to DLQ
        }
      }, { noAck: false })

      return
    } catch {
      console.log('RabbitMQ not ready, retrying...');
      retries--
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  throw new Error('Could not connect to RabbitMQ');
}

async function handleTicketCreated(event: TicketCreatedEvent): Promise<void> {
  console.log('🎫 Ticket created:', event.payload.id);

  // Invalidate tickets list cache
  await invalidateTicketsCache();

  // TODO: Add additional processing
  // - envio de e-mail
  // - auditoria
  // - integração externa
  // - métricas
}

async function handleTicketStatusChanged(event: TicketStatusChangedEvent): Promise<void> {
  console.log(
    `🔄 Ticket ${event.payload.id} status changed: ${event.payload.oldStatus} → ${event.payload.newStatus}`
  );

  // Invalidate tickets list cache
  await invalidateTicketsCache();

  // TODO: Add additional processing
  // - Notifications
  // - Metrics
}

async function handleTicketUpdated(event: TicketUpdatedEvent): Promise<void> {
  console.log('✏️ Ticket updated:', event.payload.id);

  // Invalidate tickets list cache
  await invalidateTicketsCache();

  // TODO: Add additional processing
  // - Notifications
  // - Update search index
}

/**
 * Invalidate all tickets cache using Redis pattern matching
 */
async function invalidateTicketsCache(): Promise<void> {
  try {
    const pattern = 'tickets:list*';
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️ Invalidated ${keys.length} cache key(s)`);
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

bootstrap().catch(console.error)