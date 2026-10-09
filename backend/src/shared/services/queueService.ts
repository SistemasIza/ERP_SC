// Queue service for async task processing
import { logger } from '../../core/logger';

interface QueueTask {
  id: string;
  name: string;
  handler: () => Promise<any>;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay: number;
  createdAt: number;
  scheduledAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: Error;
}

class QueueService {
  private queues: Map<string, QueueTask[]> = new Map();
  private processing: Set<string> = new Set();
  private workers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  // Add task to queue
  addTask(
    queueName: string,
    name: string,
    handler: () => Promise<any>,
    options: {
      priority?: number;
      maxAttempts?: number;
      delay?: number;
      scheduledAt?: number;
    } = {}
  ): string {
    const taskId = `${queueName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: QueueTask = {
      id: taskId,
      name,
      handler,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay || 0,
      createdAt: Date.now(),
      scheduledAt: options.scheduledAt || Date.now()
    };

    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }

    const queue = this.queues.get(queueName)!;
    queue.push(task);
    
    // Sort by priority (higher priority first)
    queue.sort((a, b) => b.priority - a.priority);

    logger.info(`Task added to queue`, { queueName, taskId, name });
    
    // Start processing if not running
    if (!this.isRunning) {
      this.start();
    }

    return taskId;
  }

  // Start queue processing
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('Queue service started');
    
    // Process all queues
    for (const queueName of this.queues.keys()) {
      this.processQueue(queueName);
    }
  }

  // Stop queue processing
  stop(): void {
    this.isRunning = false;
    
    // Stop all workers
    for (const [queueName, timeout] of this.workers.entries()) {
      clearTimeout(timeout);
      this.workers.delete(queueName);
    }
    
    logger.info('Queue service stopped');
  }

  // Process a specific queue
  private async processQueue(queueName: string): Promise<void> {
    if (!this.isRunning) return;

    const queue = this.queues.get(queueName);
    if (!queue || queue.length === 0) {
      // Schedule next check
      this.workers.set(queueName, setTimeout(() => this.processQueue(queueName), 1000));
      return;
    }

    // Check if queue is already being processed
    if (this.processing.has(queueName)) {
      this.workers.set(queueName, setTimeout(() => this.processQueue(queueName), 100));
      return;
    }

    this.processing.add(queueName);

    try {
      // Get next task that is ready to execute
      const now = Date.now();
      const taskIndex = queue.findIndex(t => t.scheduledAt <= now);
      
      if (taskIndex === -1) {
        // No tasks ready, check again later
        this.processing.delete(queueName);
        this.workers.set(queueName, setTimeout(() => this.processQueue(queueName), 1000));
        return;
      }

      const task = queue.splice(taskIndex, 1)[0];
      task.startedAt = Date.now();

      logger.info(`Processing task`, { queueName, taskId: task.id, name: task.name });

      try {
        // Execute task handler
        const result = await task.handler();
        
        task.completedAt = Date.now();
        const duration = task.completedAt - task.startedAt;
        
        logger.info(`Task completed successfully`, { 
          queueName, 
          taskId: task.id, 
          name: task.name, 
          duration: `${duration}ms` 
        });

      } catch (error) {
        task.error = error as Error;
        task.attempts++;

        logger.error(`Task failed`, { 
          queueName, 
          taskId: task.id, 
          name: task.name, 
          attempt: task.attempts,
          error: error 
        });

        // Retry if attempts remaining
        if (task.attempts < task.maxAttempts) {
          const delay = task.delay * Math.pow(2, task.attempts - 1); // Exponential backoff
          task.scheduledAt = Date.now() + delay;
          queue.push(task);
          queue.sort((a, b) => b.priority - a.priority);
          
          logger.info(`Task scheduled for retry`, { 
            queueName, 
            taskId: task.id, 
            attempt: task.attempts, 
            delay: `${delay}ms` 
          });
        } else {
          logger.error(`Task failed after max attempts`, { 
            queueName, 
            taskId: task.id, 
            name: task.name,
            maxAttempts: task.maxAttempts 
          });
        }
      }
    } catch (error) {
      logger.error(`Queue processing error`, { queueName, error });
    } finally {
      this.processing.delete(queueName);
      
      // Continue processing
      if (this.isRunning) {
        this.workers.set(queueName, setTimeout(() => this.processQueue(queueName), 10));
      }
    }
  }

  // Get queue statistics
  getQueueStats(queueName: string): {
    pending: number;
    processing: boolean;
  } {
    const queue = this.queues.get(queueName);
    return {
      pending: queue?.length || 0,
      processing: this.processing.has(queueName)
    };
  }

  // Get all queue statistics
  getAllStats(): Record<string, { pending: number; processing: boolean }> {
    const stats: Record<string, { pending: number; processing: boolean }> = {};
    
    for (const queueName of this.queues.keys()) {
      stats[queueName] = this.getQueueStats(queueName);
    }
    
    return stats;
  }

  // Clear a queue
  clearQueue(queueName: string): void {
    this.queues.delete(queueName);
    this.processing.delete(queueName);
    
    const timeout = this.workers.get(queueName);
    if (timeout) {
      clearTimeout(timeout);
      this.workers.delete(queueName);
    }
    
    logger.info(`Queue cleared`, { queueName });
  }

  // Clear all queues
  clearAll(): void {
    for (const queueName of this.queues.keys()) {
      this.clearQueue(queueName);
    }
    
    logger.info('All queues cleared');
  }
}

// Export singleton instance
export const queueService = new QueueService();

// Pre-defined queue names
export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
  WEBHOOKS: 'webhooks',
  REPORTS: 'reports',
  MAINTENANCE: 'maintenance',
  ANALYTICS: 'analytics',
  SYNC: 'sync'
};

// Helper functions for common queue operations
export const sendEmail = async (to: string, subject: string, body: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Email sending logic would go here
    logger.info('Sending email', { to, subject });
    setTimeout(() => {
      logger.info('Email sent successfully', { to });
      resolve();
    }, 1000);
  });
};

export const sendNotification = async (userId: string, message: string, type: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    logger.info('Sending notification', { userId, message, type });
    setTimeout(() => {
      logger.info('Notification sent successfully', { userId });
      resolve();
    }, 500);
  });
};

export const triggerWebhook = async (url: string, payload: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    logger.info('Triggering webhook', { url });
    setTimeout(() => {
      logger.info('Webhook triggered successfully', { url });
      resolve();
    }, 300);
  });
};

// Queue task wrappers
export const queueEmail = (to: string, subject: string, body: string, options?: any): string => {
  return queueService.addTask(
    QUEUE_NAMES.EMAIL,
    'send-email',
    () => sendEmail(to, subject, body),
    options
  );
};

export const queueNotification = (userId: string, message: string, type: string, options?: any): string => {
  return queueService.addTask(
    QUEUE_NAMES.NOTIFICATIONS,
    'send-notification',
    () => sendNotification(userId, message, type),
    options
  );
};

export const queueWebhook = (url: string, payload: any, options?: any): string => {
  return queueService.addTask(
    QUEUE_NAMES.WEBHOOKS,
    'trigger-webhook',
    () => triggerWebhook(url, payload),
    options
  );
};

// Start queue service on application startup
if (process.env.ENABLE_QUEUE_SERVICE !== 'false') {
  queueService.start();
}

export default queueService;
