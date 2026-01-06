import { Injectable } from '@nestjs/common';

/**
 * Mock RabbitMQ Service for e2e tests
 * Prevents tests from requiring a real RabbitMQ connection
 */
@Injectable()
export class RabbitMQMockService {
  private publishedMessages: Array<{ routingKey: string; payload: unknown }> =
    [];

  publish<T>(routingKey: string, payload: T): void {
    // Just store the message for potential verification in tests
    this.publishedMessages.push({ routingKey, payload });
    // Optionally log for debugging
    if (process.env.DEBUG_TESTS === 'true') {
      console.log(`[RabbitMQ Mock] Published: ${routingKey}`, payload);
    }
  }

  /**
   * Get all published messages (useful for test assertions)
   */
  getPublishedMessages(): Array<{ routingKey: string; payload: unknown }> {
    return this.publishedMessages;
  }

  /**
   * Clear published messages (useful for test cleanup)
   */
  clearPublishedMessages(): void {
    this.publishedMessages = [];
  }

  /**
   * Get messages published to a specific routing key
   */
  getMessagesByRoutingKey(routingKey: string): unknown[] {
    return this.publishedMessages
      .filter((msg) => msg.routingKey === routingKey)
      .map((msg) => msg.payload);
  }
}
