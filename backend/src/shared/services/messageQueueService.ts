import { Queue, Worker, Job } from 'bullmq';

interface MessageQueueJob {
  messageId: string;
  connectionId: string;
  organizationId: string;
  conversationId: string;
  contactId: string;
  senderPhone: string;
  message: any;
  timestamp: string;
}

/**
 * Message Queue Service
 * 
 * Handles routing of incoming messages to a Redis-backed queue for
 * asynchronous processing by background workers. This ensures:
 * - Fast HTTP response times (< 3 seconds)
 * - Reliable message processing
 * - Scalability through worker processes
 */
class MessageQueueService {
  private queue: Queue<MessageQueueJob, any, string, MessageQueueJob, any, string> | null = null;
  private worker: Worker<MessageQueueJob> | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (process.env.USE_REDIS !== 'true') {
      console.log('[MessageQueue] USE_REDIS is not true. Running with in-memory fallback (No Redis).');
      // Mock queue for local development without Redis
      this.queue = {
        add: async (name: string, data: any) => {
          console.log(`[MockQueue] Added message to in-memory queue: ${data.messageId}`);
          return { id: data.messageId, data } as any;
        },
        getWaitingCount: async () => 0,
        getActiveCount: async () => 0,
        getCompletedCount: async () => 0,
        getFailedCount: async () => 0,
        close: async () => {}
      } as any;
      return;
    }

    try {
      // Create message queue with connection options
      this.queue = new Queue<MessageQueueJob, any, string, MessageQueueJob, any, string>('whatsapp-messages', {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          maxRetriesPerRequest: 3,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            count: 1000,
            age: 3600, // Keep completed jobs for 1 hour
          },
          removeOnFail: {
            count: 5000,
            age: 86400, // Keep failed jobs for 24 hours
          },
        },
      });

      console.log('[MessageQueue] Queue initialized successfully');
    } catch (error) {
      console.error('[MessageQueue] Error initializing queue:', error);
    }
  }

  /**
   * Add a message to the processing queue
   */
  async addMessageToQueue(jobData: MessageQueueJob): Promise<Job<MessageQueueJob>> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    try {
      const job = await this.queue.add('process-message', jobData, {
        jobId: jobData.messageId, // Deduplicate by message ID
      });

      console.log(`[MessageQueue] Message ${jobData.messageId} added to queue`);
      return job;
    } catch (error) {
      console.error('[MessageQueue] Error adding message to queue:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (!this.queue) {
      return null;
    }

    try {
      const waiting = await this.queue.getWaitingCount();
      const active = await this.queue.getActiveCount();
      const completed = await this.queue.getCompletedCount();
      const failed = await this.queue.getFailedCount();

      return {
        waiting,
        active,
        completed,
        failed,
      };
    } catch (error) {
      console.error('[MessageQueue] Error getting queue stats:', error);
      return null;
    }
  }

  /**
   * Clean up resources
   */
  async close() {
    if (this.queue) {
      await this.queue.close();
    }
    if (this.worker) {
      await this.worker.close();
    }
  }
}

// Export singleton instance
export const messageQueueService = new MessageQueueService();
