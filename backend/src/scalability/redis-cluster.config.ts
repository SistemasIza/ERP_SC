/**
 * Redis Cluster Configuration
 * Configuration for Redis clustering and distributed caching
 */

export interface RedisClusterConfig {
  nodes: Array<{
    host: string;
    port: number;
    password?: string;
  }>;
  options: {
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
    retryStrategy: (times: number) => number | void;
    enableOfflineQueue: boolean;
    redisOptions: {
      password?: string;
      db?: number;
    };
  };
  cluster: {
    enabled: boolean;
    slotsRefreshInterval: number;
    retryDelayOnFailover: number;
    retryDelayOnClusterDown: number;
  };
}

export const defaultRedisClusterConfig: RedisClusterConfig = {
  nodes: [
    { host: 'localhost', port: 6379 },
    { host: 'localhost', port: 6380 },
    { host: 'localhost', port: 6381 },
  ],
  options: {
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times < 3) return 50;
      if (times < 10) return 100;
      return 500;
    },
    enableOfflineQueue: true,
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      db: 0,
    },
  },
  cluster: {
    enabled: true,
    slotsRefreshInterval: 5000,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 300,
  },
};
