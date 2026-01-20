import 'dotenv/config'
import amqp, { type ConsumeMessage } from 'amqplib'
import Redis from 'ioredis'
import { Pool } from 'pg'
import { TicketCreatedEvent } from '../../../packages/events/ticket-created.event'
import { TicketStatusChangedEvent } from '../../../packages/events/ticket-status-changed.event'
import { TicketUpdatedEvent } from '../../../packages/events/ticket-updated.event'
import { MessageSentEvent } from '../../../packages/events/message-sent.event'

const EXCHANGE = 'opsdesk.events'
const TICKET_CREATED_QUEUE = 'ticket.created.queue'
const TICKET_STATUS_CHANGED_QUEUE = 'ticket.status_changed.queue'
const TICKET_UPDATED_QUEUE = 'ticket.updated.queue'
const MESSAGE_SENT_QUEUE = 'message.sent.queue'
const DLQ = 'tickets.dlq'

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 30000 // 30 seconds

// Metrics
const metrics = {
  processed: 0,
  failed: 0,
  retried: 0,
  duplicates: 0,
}

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
})

// Initialize PostgreSQL pool for idempotency checks
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB || 'opsdesk',
  user: process.env.POSTGRES_USER || 'opsdesk',
  password: process.env.POSTGRES_PASSWORD || 'opsdesk',
})

async function bootstrap(): Promise<void> {
  await connectWithRetry()
  
  // Print metrics every 30 seconds
  setInterval(() => {
    console.log('\n📊 Worker Metrics:')
    console.log(`  ✅ Processed: ${metrics.processed}`)
    console.log(`  ❌ Failed: ${metrics.failed}`)
    console.log(`  🔄 Retried: ${metrics.retried}`)
    console.log(`  ⏭️  Duplicates: ${metrics.duplicates}`)
  }, 30000)
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

      // Set prefetch to 1 for better load distribution
      await channel.prefetch(1)

      await channel.assertExchange(EXCHANGE, 'topic', { durable: true })
      
      // Setup Dead Letter Queue
      await channel.assertQueue(DLQ, { durable: true })
      
      // Setup ticket.created queue
      await channel.assertQueue(TICKET_CREATED_QUEUE, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: DLQ,
      })
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

      // Setup message.sent queue
      await channel.assertQueue(MESSAGE_SENT_QUEUE, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: DLQ,
      })
      await channel.bindQueue(MESSAGE_SENT_QUEUE, EXCHANGE, 'message.sent')

      console.log('📥 Worker listening for events');
      console.log('   - ticket.created');
      console.log('   - ticket.status_changed');
      console.log('   - ticket.updated');
      console.log('   - message.sent');

      // Consumer for ticket.created
      channel.consume(TICKET_CREATED_QUEUE, async (msg: ConsumeMessage | null) => {
        if (!msg) return
        await handleMessage(msg, channel, 'ticket.created', handleTicketCreated)
      }, { noAck: false })

      // Consumer for ticket.status_changed
      channel.consume(TICKET_STATUS_CHANGED_QUEUE, async (msg: ConsumeMessage | null) => {
        if (!msg) return
        await handleMessage(msg, channel, 'ticket.status_changed', handleTicketStatusChanged)
      }, { noAck: false })

      // Consumer for ticket.updated
      channel.consume(TICKET_UPDATED_QUEUE, async (msg: ConsumeMessage | null) => {
        if (!msg) return
        await handleMessage(msg, channel, 'ticket.updated', handleTicketUpdated)
      }, { noAck: false })

      // Consumer for message.sent
      channel.consume(MESSAGE_SENT_QUEUE, async (msg: ConsumeMessage | null) => {
        if (!msg) return
        await handleMessage(msg, channel, 'message.sent', handleMessageSent)
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

/**
 * Generic message handler with idempotency, retry logic, and error handling
 */
async function handleMessage<T>(
  msg: ConsumeMessage,
  channel: amqp.Channel,
  eventType: string,
  handler: (payload: T) => Promise<void>
): Promise<void> {
  const startTime = Date.now()
  const messageId = msg.properties.messageId || msg.fields.deliveryTag.toString()
  
  try {
    // Check idempotency - has this message been processed already?
    const isProcessed = await checkIfProcessed(messageId, eventType)
    
    if (isProcessed) {
      console.log(`⏭️  Message ${messageId} (${eventType}) already processed, skipping`)
      metrics.duplicates++
      channel.ack(msg)
      return
    }

    // Parse message
    const payload = JSON.parse(msg.content.toString()) as T

    // Get retry count from message headers
    const retryCount = msg.properties.headers?.['x-retry-count'] || 0

    // Process the message
    await handler(payload)

    // Mark as processed for idempotency
    await markAsProcessed(messageId, eventType)

    // Acknowledge the message
    channel.ack(msg)
    
    metrics.processed++
    const duration = Date.now() - startTime
    console.log(`✅ Processed ${eventType} in ${duration}ms (messageId: ${messageId})`)
    
  } catch (error) {
    console.error(`❌ Error processing ${eventType}:`, error)
    
    const retryCount = msg.properties.headers?.['x-retry-count'] || 0
    
    // Check if we should retry
    if (retryCount < MAX_RETRIES) {
      // Retry with exponential backoff
      await retryMessage(msg, channel, eventType, retryCount)
      metrics.retried++
    } else {
      // Max retries reached, send to DLQ
      console.error(`🚨 Max retries reached for ${eventType}, sending to DLQ`)
      metrics.failed++
      channel.nack(msg, false, false)
    }
  }
}

/**
 * Retry message with exponential backoff
 */
async function retryMessage(
  msg: ConsumeMessage,
  channel: amqp.Channel,
  eventType: string,
  currentRetryCount: number
): Promise<void> {
  const nextRetryCount = currentRetryCount + 1
  const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, currentRetryCount), MAX_RETRY_DELAY)
  
  console.log(`🔄 Retrying ${eventType} (attempt ${nextRetryCount}/${MAX_RETRIES}) after ${delay}ms`)

  // Wait for exponential backoff delay
  await new Promise((resolve) => setTimeout(resolve, delay))

  // Republish message with updated retry count
  channel.publish(
    EXCHANGE,
    msg.fields.routingKey,
    msg.content,
    {
      persistent: true,
      headers: {
        ...msg.properties.headers,
        'x-retry-count': nextRetryCount,
      },
      messageId: msg.properties.messageId,
    }
  )

  // Acknowledge original message
  channel.ack(msg)
}

/**
 * Check if an event has already been processed (idempotency)
 */
async function checkIfProcessed(eventId: string, eventType: string): Promise<boolean> {
  const client = await pgPool.connect()
  try {
    const result = await client.query(
      'SELECT 1 FROM processed_events WHERE event_id = $1 AND event_type = $2 LIMIT 1',
      [eventId, eventType]
    )
    return result.rows.length > 0
  } finally {
    client.release()
  }
}

/**
 * Mark an event as processed (idempotency)
 */
async function markAsProcessed(eventId: string, eventType: string): Promise<void> {
  const client = await pgPool.connect()
  try {
    await client.query(
      'INSERT INTO processed_events (event_id, event_type, processor_name, processed_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (event_id) DO NOTHING',
      [eventId, eventType, 'worker']
    )
  } finally {
    client.release()
  }
}

async function handleTicketCreated(event: TicketCreatedEvent): Promise<void> {
  console.log('🎫 Ticket created:', event.payload.id);

  // Invalidate tickets list cache
  await invalidateTicketsCache();

  // Simulate additional processing
  // In a real application, you might:
  // - Send email notifications
  // - Create external integrations (Slack, JIRA, etc.)
  // - Update analytics/metrics
  // - Trigger workflows
  
  // Example: Send "fake" notification
  console.log(`   📧 [FAKE] Email notification sent to ticket owner ${event.payload.ownerId}`)
}

async function handleTicketStatusChanged(event: TicketStatusChangedEvent): Promise<void> {
  console.log(
    `🔄 Ticket ${event.payload.id} status changed: ${event.payload.oldStatus} → ${event.payload.newStatus}`
  );

  // Invalidate tickets list cache
  await invalidateTicketsCache();

  // Simulate additional processing
  // - Send status change notifications
  // - Update SLA metrics
  // - Trigger escalation workflows if needed
  
  console.log(`   📧 [FAKE] Status change notification sent to stakeholders`)
}

async function handleTicketUpdated(event: TicketUpdatedEvent): Promise<void> {
  console.log('✏️ Ticket updated:', event.payload.id);

  // Invalidate tickets list cache
  await invalidateTicketsCache();

  // Simulate additional processing
  // - Update search indices
  // - Send update notifications
  // - Log analytics events
  
  console.log(`   📧 [FAKE] Update notification sent`)
}

async function handleMessageSent(event: MessageSentEvent): Promise<void> {
  console.log(`💬 Message sent in ticket ${event.payload.ticketId} by ${event.payload.authorId}`)

  // Simulate additional processing
  // - Send notifications to ticket watchers
  // - Update unread message counts
  // - Index message for search
  // - Check for mentions and notify users
  
  console.log(`   📧 [FAKE] Message notification sent to ticket watchers`)
  
  // Optionally invalidate related caches
  // await redis.del(`ticket:${event.payload.ticketId}:messages`)
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
      console.log(`   🗑️  Invalidated ${keys.length} cache key(s)`);
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  await pgPool.end()
  await redis.quit()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...')
  await pgPool.end()
  await redis.quit()
  process.exit(0)
})

bootstrap().catch(console.error)
