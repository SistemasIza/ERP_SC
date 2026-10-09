import pino from 'pino';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

export const logger = {
  info: (msg: string | object, meta?: any) => {
    if (typeof msg === 'string') {
      pinoLogger.info(meta || {}, msg);
    } else {
      pinoLogger.info(msg, meta || '');
    }
  },
  error: (msg: string | Error | object, meta?: any) => {
    if (typeof msg === 'string' || msg instanceof Error) {
      pinoLogger.error(meta || {}, typeof msg === 'string' ? msg : msg.message);
    } else {
      pinoLogger.error(msg, meta || '');
    }
  },
  warn: (msg: string | object, meta?: any) => {
    if (typeof msg === 'string') {
      pinoLogger.warn(meta || {}, msg);
    } else {
      pinoLogger.warn(msg, meta || '');
    }
  },
  debug: (msg: string | object, meta?: any) => {
    if (typeof msg === 'string') {
      pinoLogger.debug(meta || {}, msg);
    } else {
      pinoLogger.debug(msg, meta || '');
    }
  },
};
