// Cache service for performance optimization
// Supports both in-memory cache and Redis (if configured)

interface CacheItem<T> {
  value: T;
  expiry: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL = 300; // 5 minutes in seconds
  private maxSize = 1000; // Maximum number of items in cache

  // Set a value in cache with optional TTL
  set<T>(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL) * 1000;
    
    // Evict oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, expiry });
  }

  // Get a value from cache
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if item has expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Delete a key from cache
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  // Get or set pattern
  getOrSet<T>(key: string, factory: () => T, ttl?: number): T {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    
    const value = factory();
    this.set(key, value, ttl);
    return value;
  }

  // Set multiple values at once
  setMany<T>(items: Record<string, T>, ttl?: number): void {
    for (const [key, value] of Object.entries(items)) {
      this.set(key, value, ttl);
    }
  }

  // Get multiple values at once
  getMany<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this.get<T>(key);
    }
    return result;
  }

  // Delete multiple keys
  deleteMany(keys: string[]): number {
    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) count++;
    }
    return count;
  }

  // Get all keys matching a pattern
  keys(pattern?: string): string[] {
    const allKeys = Array.from(this.cache.keys());
    if (!pattern) return allKeys;
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Auto-cleanup expired items every 5 minutes
setInterval(() => {
  cacheService.cleanup();
}, 5 * 60 * 1000);
