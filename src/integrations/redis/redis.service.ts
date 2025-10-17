import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  /**
   * Get the next chunk index for a recording session
   * Uses Redis INCR for atomic increment across multiple instances
   */
  async getNextChunkIndex(recordId: string): Promise<number> {
    const key = `recording:${recordId}:chunk_index`;
    const index = await this.client.incr(key);
    // Return 0-based index (INCR returns 1 for first call)
    return index - 1;
  }

  /**
   * Get the current chunk count for a recording
   */
  async getChunkCount(recordId: string): Promise<number> {
    const key = `recording:${recordId}:chunk_index`;
    const count = await this.client.get(key);
    return count ? parseInt(count) : 0;
  }

  /**
   * Set chunk metadata (for tracking received chunks)
   */
  async setChunkMetadata(
    recordId: string,
    index: number,
    metadata: { size: number; timestamp: number },
  ): Promise<void> {
    const key = `recording:${recordId}:chunk:${index}:meta`;
    await this.client.setex(key, 3600, JSON.stringify(metadata)); // 1 hour TTL
  }

  /**
   * Get chunk metadata
   */
  async getChunkMetadata(
    recordId: string,
    index: number,
  ): Promise<{ size: number; timestamp: number } | null> {
    const key = `recording:${recordId}:chunk:${index}:meta`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Delete all recording data from Redis
   */
  async deleteRecordingData(recordId: string): Promise<void> {
    // Delete chunk index
    const indexKey = `recording:${recordId}:chunk_index`;
    await this.client.del(indexKey);

    // Delete all chunk metadata
    const metaKeys = await this.client.keys(
      `recording:${recordId}:chunk:*:meta`,
    );
    if (metaKeys.length > 0) {
      await this.client.del(...metaKeys);
    }

    // Delete finalization lock if exists
    const lockKey = `recording:${recordId}:finalizing`;
    await this.client.del(lockKey);

    // Delete started_at timestamp
    const startedKey = `recording:${recordId}:started_at`;
    await this.client.del(startedKey);
  }

  /**
   * Try to acquire finalization lock for a recording
   * Returns true if lock acquired, false if already locked
   * Lock auto-expires after 30 seconds to prevent deadlock
   */
  async acquireFinalizationLock(recordId: string): Promise<boolean> {
    const key = `recording:${recordId}:finalizing`;
    // SET with NX (only if not exists) and EX (expiration in seconds)
    // Returns 'OK' if successful, null if key already exists
    const result = await this.client.set(key, '1', 'EX', 30, 'NX');
    return result === 'OK';
  }

  /**
   * Release finalization lock
   */
  async releaseFinalizationLock(recordId: string): Promise<void> {
    const key = `recording:${recordId}:finalizing`;
    await this.client.del(key);
  }

  /**
   * Check if recording is being finalized
   */
  async isRecordingFinalizing(recordId: string): Promise<boolean> {
    const key = `recording:${recordId}:finalizing`;
    const result = await this.client.get(key);
    return result !== null;
  }

  /**
   * Get the Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Set a value with optional expiration
   */
  async set(
    key: string,
    value: string,
    expirationSeconds?: number,
  ): Promise<void> {
    if (expirationSeconds) {
      await this.client.setex(key, expirationSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }
}
