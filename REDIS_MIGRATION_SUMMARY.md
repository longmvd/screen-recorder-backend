# Redis Migration for High Availability (HA)

## Problem Identified

The original implementation used an in-memory `sessionChunkIndex` object to track chunk indices:

```typescript
private sessionChunkIndex: Record<string, number> = {};
```

**Issue in HA Environment:**
- Each application instance maintains its own separate counter
- Load balancer distributes requests across instances
- Multiple chunks get the same index number
- Results in data loss and corruption

## Solution Implemented

Migrated to **Redis-based atomic counter** that all instances share.

## Changes Made

### 1. Dependencies Added
```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

### 2. New Files Created

#### `src/intergrations/redis/redis.module.ts`
- Global Redis module
- Exports RedisService for use across the application

#### `src/intergrations/redis/redis.service.ts`
- Redis client wrapper
- `getNextChunkIndex(recordId)` - Atomic counter using Redis INCR
- `deleteRecordingData(recordId)` - Cleanup on recording finish
- Connection management with retry strategy
- Error handling and logging

### 3. Files Modified

#### `src/modules/recording/recording.module.ts`
- Imported RedisModule

#### `src/modules/recording/recording.gateway.ts`
- **REMOVED:** In-memory `sessionChunkIndex` object
- **ADDED:** RedisService injection
- **UPDATED:** `handleStart()` - No longer initializes counter
- **UPDATED:** `handleChunk()` - Uses Redis atomic INCR
- **UPDATED:** `handleStop()` - Cleans up Redis data

## How It Works

### Before (Single Instance Only)
```
App Instance
├── sessionChunkIndex = { "rec1": 0 }
├── Client sends chunk → index = 0
├── sessionChunkIndex = { "rec1": 1 }
└── Save chunk-000.webm
```

### After (HA Compatible)
```
Instance 1                    Redis (localhost:6379)         Instance 2
│                            │                              │
├─ Client chunk →            │                              │
│  GET index from Redis ──→  │ INCR rec1:index → 0         │
│  Save chunk-000.webm       │                              │
│                            │                              │
│                            │                              ├─ Client chunk →
│                            │  INCR rec1:index → 1  ←──────┤  GET index from Redis
│                            │                              │  Save chunk-001.webm
│                            │                              │
├─ Client chunk →            │                              │
│  GET index from Redis ──→  │ INCR rec1:index → 2         │
│  Save chunk-002.webm       │                              │
```

**Result:** Perfect sequential numbering across all instances!

## Configuration

### Environment Variables (Optional)
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

Defaults to `localhost:6379` if not specified.

## Benefits

✅ **HA Compatible** - Multiple instances can run simultaneously  
✅ **Atomic Operations** - No race conditions between instances  
✅ **Data Integrity** - Guaranteed sequential chunk numbering  
✅ **Scalable** - Add/remove instances without coordination  
✅ **Simple** - Single Redis instance sufficient (HA optional)  

## Testing HA Setup

### Terminal 1
```bash
npm run start:dev
```

### Terminal 2
```bash
PORT=8001 npm run start:dev
```

Both instances will share the same Redis counter, ensuring correct chunk indexing.

## Redis Key Structure

```
recording:{recordId}:chunk_index  → Counter for chunk indices
```

Keys are automatically cleaned up when recording stops.

## Architecture Notes

- Redis placed in `src/intergrations/redis/` to match existing structure
- Follows hybrid architecture pattern (modules + integrations)
- Prepared for future microservices migration
- RedisModule is global - available throughout application

## Future Improvements

- Add Redis Sentinel for Redis HA (if needed)
- Implement connection pooling for high traffic
- Add metrics/monitoring for Redis operations
- Consider TTL for automatic key expiration
