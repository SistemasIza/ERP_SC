import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import pino from 'pino';
import { handleIncomingMessage } from './modules/bots/engine/flow-core';
import { supabase } from './core/config/supabase';

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

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

async function createWorker() {
  const worker = new Worker<MessageQueueJob>(
    'whatsapp-messages',
    async (job: Job<MessageQueueJob>) => {
      const { messageId, connectionId, organizationId, conversationId, contactId, senderPhone, message } = job.data;

      logger.info({ messageId, connectionId }, '[Worker] Processing message');

      try {
        // Create WhatsApp service adapter for this connection
        const waServiceAdapter = {
          sendTextMessage: async (to: string, body: string, options?: { jid?: string }) => {
            // This would need to be implemented to send messages through the active connection
            // For now, we'll need to fetch the connection and use its socket
            logger.info({ to, body }, '[Worker] Sending text message');
            // Implementation would go here
          },
          sendButtonMessage: async (to: string, bodyText: string, buttons: any[], options?: { jid?: string }) => {
            logger.info({ to, bodyText, buttons }, '[Worker] Sending button message');
            // Implementation would go here
          },
          sendMediaMessage: async (to: string, url: string, options?: any) => {
            logger.info({ to, url }, '[Worker] Sending media message');
            // Implementation would go here
          },
        };

        // Process the message through the flow engine
        const organizationConfig = {
          organizationId,
          conversationId,
          contactId,
          whatsappConnectionId: connectionId,
        };

        await handleIncomingMessage(message, senderPhone, organizationConfig, waServiceAdapter);

        logger.info({ messageId }, '[Worker] Message processed successfully');
      } catch (error) {
        logger.error({ messageId, error }, '[Worker] Error processing message');
        throw error;
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 3,
      },
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
      limiter: {
        max: 100,
        duration: 60000, // 100 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, '[Worker] Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, '[Worker] Job failed');
  });

  logger.info('[Worker] Message queue worker started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('[Worker] SIGTERM received, shutting down gracefully');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('[Worker] SIGINT received, shutting down gracefully');
    await worker.close();
    process.exit(0);
  });
}

createWorker().catch((error) => {
  logger.error(error, '[Worker] Failed to start worker');
  process.exit(1);
});
