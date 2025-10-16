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
   * Delete all recording data from Redis
   */
  async deleteRecordingData(recordId: string): Promise<void> {
    const key = `recording:${recordId}:chunk_index`;
    await this.client.del(key);
  }

  /**
   * Get the Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }
}
