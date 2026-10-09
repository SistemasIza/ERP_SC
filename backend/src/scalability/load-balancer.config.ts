/**
 * Load Balancer Configuration
 * Configuration for horizontal scaling and load balancing
 */

export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted';
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    unhealthyThreshold: number;
    healthyThreshold: number;
  };
  stickySessions: {
    enabled: boolean;
    cookieName: string;
    duration: number;
  };
  maxConnections: number;
  timeout: number;
}

export const defaultLoadBalancerConfig: LoadBalancerConfig = {
  strategy: 'round-robin',
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    unhealthyThreshold: 3,
    healthyThreshold: 2,
  },
  stickySessions: {
    enabled: false,
    cookieName: 'JSESSIONID',
    duration: 3600000, // 1 hour
  },
  maxConnections: 10000,
  timeout: 30000,
};
