# EPIC 6 — Messaging (RabbitMQ) + Worker - Learning Guide

## 📚 Table of Contents

1. [Overview](#overview)
2. [Learning Objectives](#learning-objectives)
3. [Architecture Overview](#architecture-overview)
4. [Implementation Details](#implementation-details)
5. [Key Concepts Explained](#key-concepts-explained)
6. [Testing the Implementation](#testing-the-implementation)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [Further Reading](#further-reading)

---

## Overview

EPIC 6 implements asynchronous message processing using **RabbitMQ** as the message broker and a dedicated **Worker** service to consume and process domain events. This pattern decouples event producers from consumers, enabling scalability, reliability, and better separation of concerns.

### What Was Implemented

✅ **US6.1 – Domain Event Publishing**
- Published `ticket.created` event (already implemented)
- Published `ticket.status_changed` event (already implemented)
- Published `ticket.updated` event (already implemented)
- **NEW:** Published `message.sent` event

✅ **US6.2 – Worker Consumer**
- Worker consuming all four event types
- Fake notification logging
- Cache invalidation on ticket changes
- **Metrics** tracking (processed, failed, retried, duplicates)

✅ **US6.3 – Idempotency**
- Database-backed idempotency using `processed_events` table
- Prevents duplicate message processing
- Handles message redelivery gracefully

✅ **Additional Features**
- **Retry with exponential backoff** (configurable)
- **Dead Letter Queue (DLQ)** for failed messages
- **Graceful shutdown** handling
- **Structured logging** with event details
- **Performance metrics** printed every 30 seconds

---

## Learning Objectives

By studying this implementation, you will learn:

1. **Message Queue Patterns**
   - Topic exchanges in RabbitMQ
   - Queue binding and routing keys
   - Message acknowledgment strategies
   - Dead Letter Queues (DLQ)

2. **Reliability Patterns**
   - Idempotency in distributed systems
   - Retry strategies with exponential backoff
   - At-least-once delivery guarantees
   - Graceful degradation

3. **Event-Driven Architecture**
   - Domain events and event sourcing concepts
   - Producer-consumer decoupling
   - Asynchronous processing benefits
   - Event-based cache invalidation

4. **Operational Concerns**
   - Worker metrics and observability
   - Error handling and logging
   - Connection resilience
   - Graceful shutdown

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   API Service   │         │    RabbitMQ      │         │  Worker Service │
│                 │         │                  │         │                 │
│  • Tickets      │────────▶│  Exchange        │────────▶│  • Consumers    │
│  • Messages     │ Publish │  (topic)         │ Consume │  • Handlers     │
│  • Users        │         │                  │         │  • Idempotency  │
│                 │         │  Queues:         │         │  • Retry Logic  │
│                 │         │  • ticket.created│         │  • Metrics      │
│                 │         │  • ticket.updated│         │                 │
│                 │         │  • status_changed│         │                 │
│                 │         │  • message.sent  │         │                 │
│                 │         │  • DLQ           │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
         │                                                         │
         │                                                         │
         ▼                                                         ▼
┌─────────────────┐                                     ┌─────────────────┐
│   PostgreSQL    │◀────────────────────────────────────│  PostgreSQL     │
│                 │         Check/Mark Processed        │                 │
│ • Tickets       │                                     │ • processed_    │
│ • Messages      │                                     │   events        │
└─────────────────┘                                     └─────────────────┘
         │                                                         │
         │                                                         │
         ▼                                                         ▼
┌─────────────────┐                                     ┌─────────────────┐
│     Redis       │◀────────────────────────────────────│     Redis       │
│                 │         Invalidate Cache            │                 │
│ • Cache         │                                     │ • Cache         │
└─────────────────┘                                     └─────────────────┘
```

### Components

1. **API Service** (`apps/api`)
   - Publishes domain events to RabbitMQ after database transactions
   - Events: `ticket.created`, `ticket.updated`, `ticket.status_changed`, `message.sent`

2. **RabbitMQ**
   - **Exchange**: `opsdesk.events` (type: `topic`)
   - **Queues**: One queue per event type + DLQ
   - **Routing Keys**: Match event names (e.g., `ticket.created`)

3. **Worker Service** (`apps/worker`)
   - Consumes messages from queues
   - Checks idempotency before processing
   - Executes business logic (notifications, cache invalidation, etc.)
   - Retries failed messages with exponential backoff
   - Sends permanently failed messages to DLQ

4. **PostgreSQL**
   - `processed_events` table tracks processed message IDs
   - Ensures idempotency across worker restarts

5. **Redis**
   - Cache storage for ticket listings
   - Invalidated by worker on ticket changes

---

## Implementation Details

### 1. Event Type Definitions

All events follow a consistent structure:

```typescript
export interface <EventName>Event {
  event: string;  // Event type identifier
  payload: {
    // Event-specific data
  };
}
```

#### New Event: `message.sent`

**File:** `packages/events/message-sent.event.ts`

```typescript
export interface MessageSentEvent {
  event: 'message.sent';
  payload: {
    id: string;
    ticketId: string;
    authorId: string;
    content: string;
    sentAt: string;
  };
}
```

### 2. Event Publishing

#### Messages Service

**File:** `apps/api/src/messages/messages.service.ts`

```typescript
async createMessage(input: CreateMessageDto) {
  // 1. Write to database in transaction
  const message = await db.transaction(async (tx) => {
    // Insert message
    // Insert audit log
    return message;
  });

  // 2. Publish event AFTER transaction commits
  const messageSentEvent: MessageSentEvent = {
    event: 'message.sent',
    payload: {
      id: message.id,
      ticketId: message.ticketId,
      authorId: message.authorId,
      content: message.content,
      sentAt: message.createdAt.toISOString(),
    },
  };

  this.rabbit.publish<MessageSentEvent>('message.sent', messageSentEvent);

  return message;
}
```

**Key Pattern:** Publish events **after** database transactions commit to ensure consistency.

### 3. Idempotency Table

**File:** `apps/api/src/db/schema/processed-events.ts`

```typescript
export const processedEvents = pgTable('processed_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: text('event_id').notNull().unique(), // Unique constraint!
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  processorName: text('processor_name').notNull(),
});
```

**Migration:** `apps/api/drizzle/0008_pale_northstar.sql`

```sql
CREATE TABLE "processed_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "processed_at" timestamp DEFAULT now() NOT NULL,
  "processor_name" text NOT NULL,
  CONSTRAINT "processed_events_event_id_unique" UNIQUE("event_id")
);
```

### 4. Worker Implementation

**File:** `apps/worker/src/consumer.ts`

#### 4.1 Connection Setup

```typescript
const connection = await amqp.connect(url)
const channel = await connection.createChannel()

// Set prefetch to 1 for better load distribution
await channel.prefetch(1)

// Assert exchange
await channel.assertExchange(EXCHANGE, 'topic', { durable: true })

// Assert DLQ
await channel.assertQueue(DLQ, { durable: true })

// Assert queues with DLQ configuration
await channel.assertQueue(MESSAGE_SENT_QUEUE, {
  durable: true,
  deadLetterExchange: '',
  deadLetterRoutingKey: DLQ,
})

// Bind queue to exchange with routing key
await channel.bindQueue(MESSAGE_SENT_QUEUE, EXCHANGE, 'message.sent')
```

#### 4.2 Generic Message Handler

```typescript
async function handleMessage<T>(
  msg: ConsumeMessage,
  channel: amqp.Channel,
  eventType: string,
  handler: (payload: T) => Promise<void>
): Promise<void> {
  const messageId = msg.properties.messageId || msg.fields.deliveryTag.toString()
  
  try {
    // 1. Check idempotency
    const isProcessed = await checkIfProcessed(messageId, eventType)
    
    if (isProcessed) {
      console.log(`⏭️  Already processed, skipping`)
      metrics.duplicates++
      channel.ack(msg)
      return
    }

    // 2. Parse and process message
    const payload = JSON.parse(msg.content.toString()) as T
    await handler(payload)

    // 3. Mark as processed
    await markAsProcessed(messageId, eventType)

    // 4. Acknowledge
    channel.ack(msg)
    metrics.processed++
    
  } catch (error) {
    // Handle error with retry logic
    const retryCount = msg.properties.headers?.['x-retry-count'] || 0
    
    if (retryCount < MAX_RETRIES) {
      await retryMessage(msg, channel, eventType, retryCount)
      metrics.retried++
    } else {
      // Send to DLQ
      metrics.failed++
      channel.nack(msg, false, false)
    }
  }
}
```

#### 4.3 Retry with Exponential Backoff

```typescript
async function retryMessage(
  msg: ConsumeMessage,
  channel: amqp.Channel,
  eventType: string,
  currentRetryCount: number
): Promise<void> {
  const nextRetryCount = currentRetryCount + 1
  
  // Calculate delay: min(1000 * 2^retryCount, 30000)
  const delay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, currentRetryCount),
    MAX_RETRY_DELAY
  )
  
  console.log(`🔄 Retrying (attempt ${nextRetryCount}/${MAX_RETRIES}) after ${delay}ms`)

  // Wait
  await new Promise((resolve) => setTimeout(resolve, delay))

  // Republish with updated retry count
  channel.publish(EXCHANGE, msg.fields.routingKey, msg.content, {
    persistent: true,
    headers: {
      ...msg.properties.headers,
      'x-retry-count': nextRetryCount,
    },
    messageId: msg.properties.messageId,
  })

  // Ack original
  channel.ack(msg)
}
```

**Retry Schedule:**
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- After 3 attempts: Send to DLQ

#### 4.4 Idempotency Functions

```typescript
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
```

**Key Pattern:** `ON CONFLICT DO NOTHING` handles race conditions between multiple workers.

#### 4.5 Metrics

```typescript
const metrics = {
  processed: 0,
  failed: 0,
  retried: 0,
  duplicates: 0,
}

// Print metrics every 30 seconds
setInterval(() => {
  console.log('\n📊 Worker Metrics:')
  console.log(`  ✅ Processed: ${metrics.processed}`)
  console.log(`  ❌ Failed: ${metrics.failed}`)
  console.log(`  🔄 Retried: ${metrics.retried}`)
  console.log(`  ⏭️  Duplicates: ${metrics.duplicates}`)
}, 30000)
```

#### 4.6 Message Handlers

```typescript
async function handleMessageSent(event: MessageSentEvent): Promise<void> {
  console.log(`💬 Message sent in ticket ${event.payload.ticketId}`)

  // Business logic:
  // - Send notifications to ticket watchers
  // - Update unread message counts
  // - Index message for search
  // - Check for mentions and notify users
  
  console.log(`   📧 [FAKE] Message notification sent to ticket watchers`)
}
```

---

## Key Concepts Explained

### 1. Why Messaging?

**Without Messaging:**
```typescript
async createTicket() {
  // Save to DB
  await db.insert(...)
  
  // Send email (slow, blocking)
  await emailService.send(...)
  
  // Update analytics (slow, blocking)
  await analyticsService.track(...)
  
  // User waits for all of this!
}
```

**With Messaging:**
```typescript
async createTicket() {
  // Save to DB
  await db.insert(...)
  
  // Publish event (fast, non-blocking)
  this.rabbit.publish('ticket.created', event)
  
  // User gets immediate response!
  // Worker handles email and analytics asynchronously
}
```

**Benefits:**
- ✅ **Faster API responses**
- ✅ **Better scalability** (scale workers independently)
- ✅ **Fault isolation** (email failure doesn't break ticket creation)
- ✅ **Retry capability** (can retry failed notifications)

### 2. Idempotency

**Problem:** Messages can be delivered multiple times due to:
- Network issues
- Consumer crashes
- Redelivery on nack
- Manual requeue

**Solution:** Track processed message IDs in database.

**Example Scenario:**

```
1. Worker receives message "msg-123"
2. Worker processes message successfully
3. Worker marks "msg-123" as processed in DB
4. Worker crashes before ACKing
5. RabbitMQ redelivers "msg-123"
6. Worker checks DB, sees "msg-123" already processed
7. Worker ACKs and skips processing (no duplicate side effects!)
```

**Why It Matters:**
- Prevents duplicate emails
- Prevents duplicate cache invalidations
- Prevents duplicate database updates
- Ensures exactly-once semantics (from business logic perspective)

### 3. Retry with Exponential Backoff

**Why Retry?**
- Temporary failures (DB connection issues, network blips)
- External service timeouts
- Rate limiting

**Why Exponential Backoff?**
```
Linear Retry:    1s, 1s, 1s, 1s, 1s... (hammers failing service)
Exponential:     1s, 2s, 4s, 8s...    (gives service time to recover)
```

**Implementation:**
```typescript
delay = Math.min(
  INITIAL_DELAY * Math.pow(2, retryCount),
  MAX_DELAY
)
```

Example:
- Retry 0: 1s
- Retry 1: 2s  (1 * 2^1)
- Retry 2: 4s  (1 * 2^2)
- Retry 3: 8s  (1 * 2^3)
- Retry 4: 16s (1 * 2^4)
- Retry 5: 30s (capped at MAX_DELAY)

### 4. Dead Letter Queue (DLQ)

**What is it?**
A special queue for messages that cannot be processed after max retries.

**Why?**
- Prevents message loss
- Allows manual inspection and recovery
- Keeps main queues moving

**How to Handle DLQ Messages:**
1. Monitor DLQ size (alert if growing)
2. Manually inspect failed messages
3. Fix underlying issues
4. Republish to main queue if appropriate
5. Or discard if message is invalid

**RabbitMQ Management UI:**
```
http://localhost:15672
Username: guest
Password: guest

Navigate to Queues → tickets.dlq
```

### 5. Message Acknowledgment

**Three Options:**

1. **Auto-ack (`noAck: true`)**
   - Message deleted immediately after delivery
   - ❌ Risk: Message lost if consumer crashes
   - Use: Only for non-critical messages

2. **Manual ack (`channel.ack(msg)`)**
   - ✅ Message deleted after successful processing
   - Use: Most common, guarantees at-least-once delivery

3. **Nack (`channel.nack(msg, false, false)`)**
   - Message rejected and sent to DLQ
   - Use: Permanent failures, poison messages

**Our Pattern:**
```typescript
try {
  await processMessage(msg)
  channel.ack(msg)  // Success
} catch (error) {
  if (shouldRetry) {
    await retryMessage(msg, channel)
  } else {
    channel.nack(msg, false, false)  // Send to DLQ
  }
}
```

### 6. Prefetch / QoS

```typescript
await channel.prefetch(1)
```

**What it does:**
- Limits number of unacknowledged messages per consumer
- Ensures even load distribution across multiple workers

**Without prefetch:**
```
Worker 1: Gets 100 messages, processes slowly
Worker 2: Gets 0 messages, sits idle
```

**With prefetch(1):**
```
Worker 1: Gets 1 message, processes, gets next
Worker 2: Gets 1 message, processes, gets next
(Fair distribution!)
```

### 7. Exchange Types

**Topic Exchange** (what we use):
```typescript
await channel.assertExchange('opsdesk.events', 'topic', { durable: true })
```

**Routing:**
- Routing key: `ticket.created`
- Binding pattern: `ticket.created` (exact match)

**Other patterns possible:**
- `ticket.*` (all ticket events)
- `*.created` (all created events)
- `#` (all events)

---

## Testing the Implementation

### 1. Start the Stack

```bash
# Start all services
docker compose up -d

# Check services are running
docker compose ps
```

### 2. Run Database Migrations

```bash
cd apps/api
pnpm drizzle-kit push
# or
make db:migrate
```

### 3. Check RabbitMQ Setup

Open RabbitMQ Management UI:
```
http://localhost:15672
Username: guest
Password: guest
```

Verify:
- Exchange `opsdesk.events` exists
- Queues exist:
  - `ticket.created.queue`
  - `ticket.status_changed.queue`
  - `ticket.updated.queue`
  - `message.sent.queue`
  - `tickets.dlq`

### 4. Test Message Publishing

#### Create a Ticket

```bash
# Login first
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Save the token
TOKEN="<your-jwt-token>"

# Create ticket
curl -X POST http://localhost:3000/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Ticket",
    "description": "Testing messaging"
  }'
```

#### Check Worker Logs

```bash
docker compose logs -f worker
```

You should see:
```
🎫 Ticket created: <ticket-id>
   📧 [FAKE] Email notification sent to ticket owner <owner-id>
   🗑️  Invalidated X cache key(s)
✅ Processed ticket.created in Xms (messageId: ...)
```

#### Send a Message

```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "ticketId": "<ticket-id>",
    "content": "Test message"
  }'
```

Check worker logs for:
```
💬 Message sent in ticket <ticket-id> by <user-id>
   📧 [FAKE] Message notification sent to ticket watchers
✅ Processed message.sent in Xms (messageId: ...)
```

### 5. Test Idempotency

#### Manually Requeue Message

1. Go to RabbitMQ Management UI
2. Navigate to Queues → `message.sent.queue`
3. Click "Get messages"
4. Select a message
5. Click "Requeue"

Worker should log:
```
⏭️  Message <msg-id> (message.sent) already processed, skipping
```

Metrics should show duplicates count increased.

### 6. Test Retry Logic

#### Simulate Failure

Temporarily modify worker handler to throw error:

```typescript
async function handleMessageSent(event: MessageSentEvent): Promise<void> {
  throw new Error('Simulated failure')
}
```

Restart worker and send a message. You should see:
```
❌ Error processing message.sent: Error: Simulated failure
🔄 Retrying message.sent (attempt 1/3) after 1000ms
❌ Error processing message.sent: Error: Simulated failure
🔄 Retrying message.sent (attempt 2/3) after 2000ms
❌ Error processing message.sent: Error: Simulated failure
🔄 Retrying message.sent (attempt 3/3) after 4000ms
🚨 Max retries reached for message.sent, sending to DLQ
```

Check DLQ in RabbitMQ UI - should contain failed message.

### 7. Monitor Metrics

Worker prints metrics every 30 seconds:

```
📊 Worker Metrics:
  ✅ Processed: 42
  ❌ Failed: 2
  🔄 Retried: 5
  ⏭️  Duplicates: 3
```

### 8. Test Graceful Shutdown

```bash
docker compose stop worker
```

Worker should log:
```
🛑 SIGTERM received, shutting down gracefully...
```

Check that:
- PostgreSQL connection closes
- Redis connection closes
- RabbitMQ connection closes
- No errors during shutdown

---

## Troubleshooting

### Problem: Worker Not Receiving Messages

**Check:**
1. Is RabbitMQ running? `docker compose ps`
2. Is worker running? `docker compose logs worker`
3. Are queues bound to exchange? Check RabbitMQ UI
4. Is API publishing events? Check API logs

**Solution:**
```bash
# Restart services
docker compose restart rabbitmq worker

# Check RabbitMQ connection
docker compose logs rabbitmq
```

### Problem: Messages Going to DLQ

**Check:**
1. Worker logs for error messages
2. DLQ in RabbitMQ UI (inspect message payload)

**Common Causes:**
- Database connection issues
- Redis connection issues
- Invalid message payload
- Handler throwing unhandled exceptions

**Solution:**
1. Fix underlying issue
2. Purge DLQ or move messages back to main queue

### Problem: Duplicate Processing

**Check:**
1. Is `processed_events` table created?
2. Is `event_id` column unique?
3. Are workers using unique message IDs?

**Verify:**
```sql
SELECT * FROM processed_events ORDER BY processed_at DESC LIMIT 10;
```

### Problem: Worker Consuming Too Fast

**Symptoms:**
- Database connection pool exhausted
- High memory usage

**Solution:**
```typescript
// Increase prefetch for throughput
await channel.prefetch(10)  // Was: 1

// Or add rate limiting
await new Promise(r => setTimeout(r, 100))  // 100ms delay per message
```

### Problem: Messages Lost

**Possible Causes:**
1. `noAck: true` (auto-ack) - messages deleted before processing
2. Worker crash before `ack()`
3. Message TTL expired
4. Queue not durable

**Solution:**
- Always use `noAck: false` and manual ack
- Ensure durable queues: `{ durable: true }`
- Ensure persistent messages: `{ persistent: true }`

---

## Best Practices

### 1. Event Naming

✅ **Good:**
```typescript
'ticket.created'
'ticket.updated'
'ticket.status_changed'
'message.sent'
```

❌ **Bad:**
```typescript
'TicketCreated'  // Inconsistent casing
'create-ticket'  // Action, not event
'ticket_create'  // Past tense
```

**Pattern:** `<entity>.<past_tense_action>`

### 2. Event Payload

✅ **Good:**
```typescript
{
  event: 'ticket.created',
  payload: {
    id: 'uuid',
    title: 'string',
    // Include enough data to avoid extra DB queries
    ownerId: 'uuid',
    createdAt: 'ISO-8601'
  }
}
```

❌ **Bad:**
```typescript
{
  event: 'ticket.created',
  payload: {
    id: 'uuid'
    // Missing critical data - forces consumer to query DB
  }
}
```

**Rule:** Include all data consumer needs to avoid N+1 queries.

### 3. Transaction Boundaries

✅ **Good:**
```typescript
// 1. Database transaction
const ticket = await db.transaction(async (tx) => {
  await tx.insert(...)
  return ticket
})

// 2. Publish event AFTER commit
this.rabbit.publish('ticket.created', event)
```

❌ **Bad:**
```typescript
await db.transaction(async (tx) => {
  await tx.insert(...)
  
  // Publishing inside transaction
  // If publish fails, DB rolls back (inconsistent state!)
  this.rabbit.publish('ticket.created', event)
})
```

### 4. Error Handling

✅ **Good:**
```typescript
try {
  await processMessage(msg)
  channel.ack(msg)
} catch (error) {
  if (isRetryable(error)) {
    await retryMessage(msg, channel)
  } else {
    channel.nack(msg, false, false)
  }
}
```

❌ **Bad:**
```typescript
try {
  await processMessage(msg)
  channel.ack(msg)
} catch (error) {
  // No handling - message stuck in unacked state!
}
```

### 5. Idempotency Keys

✅ **Good:**
```typescript
// Use RabbitMQ message ID
const messageId = msg.properties.messageId || msg.fields.deliveryTag.toString()
```

**Better:**
```typescript
// Include message ID when publishing
this.rabbit.publish('ticket.created', event, {
  messageId: ticket.id  // Use business entity ID
})
```

### 6. Queue Configuration

✅ **Good:**
```typescript
await channel.assertQueue(QUEUE_NAME, {
  durable: true,        // Survive broker restart
  deadLetterExchange: '',
  deadLetterRoutingKey: DLQ,
  messageTtl: 86400000  // 24 hours (optional)
})
```

### 7. Monitoring

**Essential Metrics:**
- Messages processed per second
- Error rate
- Retry rate
- DLQ size
- Queue depth (lag)
- Processing latency

**Implement:**
```typescript
// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    processed: metrics.processed,
    failed: metrics.failed,
    retried: metrics.retried,
    duplicates: metrics.duplicates,
    queueDepth: await getQueueDepth(),
    uptimeSeconds: process.uptime()
  })
})
```

### 8. Graceful Shutdown

✅ **Good:**
```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down...')
  
  // 1. Stop accepting new messages
  await channel.cancel(consumerTag)
  
  // 2. Wait for in-flight messages
  await new Promise(r => setTimeout(r, 5000))
  
  // 3. Close connections
  await channel.close()
  await connection.close()
  await pgPool.end()
  await redis.quit()
  
  process.exit(0)
})
```

### 9. Testing

**Unit Tests:**
```typescript
describe('handleMessageSent', () => {
  it('should send notification to watchers', async () => {
    const event = createMockEvent()
    await handleMessageSent(event)
    expect(notificationService.send).toHaveBeenCalled()
  })
  
  it('should be idempotent', async () => {
    const event = createMockEvent()
    await handleMessageSent(event)
    await handleMessageSent(event)  // Process twice
    expect(notificationService.send).toHaveBeenCalledTimes(1)
  })
})
```

**Integration Tests:**
```typescript
describe('Worker Integration', () => {
  it('should process message end-to-end', async () => {
    // Publish event
    await rabbit.publish('message.sent', event)
    
    // Wait for processing
    await waitFor(() => metrics.processed > 0)
    
    // Verify side effects
    const processed = await db.query('SELECT * FROM processed_events WHERE event_id = $1', [event.id])
    expect(processed.rows).toHaveLength(1)
  })
})
```

---

## Further Reading

### RabbitMQ
- [RabbitMQ Tutorial: Topics](https://www.rabbitmq.com/tutorials/tutorial-five-javascript.html)
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/reliability.html)
- [Prefetch & Consumer Acknowledgments](https://www.rabbitmq.com/confirms.html)

### Patterns
- [Idempotent Consumer Pattern](https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html)
- [Dead Letter Queue Pattern](https://aws.amazon.com/what-is/dead-letter-queue/)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Competing Consumers Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/competing-consumers)

### Node.js Libraries
- [amqplib Documentation](https://amqp-node.github.io/amqplib/)
- [node-postgres (pg) Documentation](https://node-postgres.com/)
- [ioredis Documentation](https://github.com/luin/ioredis)

### Best Practices
- [At-Least-Once Delivery](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Microservices Messaging](https://microservices.io/patterns/communication-style/messaging.html)

---

## Summary

You've successfully implemented a production-ready messaging system with:

✅ **Async Processing** - Non-blocking event publication
✅ **Reliability** - Retry with exponential backoff + DLQ
✅ **Idempotency** - Database-backed deduplication
✅ **Observability** - Metrics, logging, and monitoring
✅ **Scalability** - Multiple workers with fair distribution
✅ **Fault Tolerance** - Graceful shutdown and error handling

This implementation demonstrates industry-standard patterns for building robust, scalable event-driven systems.

### Next Steps

1. **Add OpenTelemetry** for distributed tracing
2. **Implement Prometheus metrics** for production monitoring
3. **Add integration tests** for worker scenarios
4. **Implement circuit breaker** for external service calls
5. **Add message schema validation** (e.g., using Zod or JSON Schema)
6. **Implement event versioning** for backward compatibility

Happy learning! 🚀
