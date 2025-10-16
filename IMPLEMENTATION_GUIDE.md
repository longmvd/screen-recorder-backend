# Screen Recorder Backend - Implementation Guide

## Overview

This implementation solves the High Availability (HA) issue with chunk indexing by using Redis as a centralized counter, and adds complete video processing with FFmpeg merging and flexible storage options.

## Architecture

### Key Components

1. **Redis-based Chunk Indexing**
   - Eliminates in-memory `sessionChunkIndex` that caused issues in HA setups
   - Uses Redis atomic operations for thread-safe chunk counting
   - Each instance gets correct chunk index regardless of which server handles the request

2. **FFmpeg Video Processing**
   - Merges WebM chunks into a single video file
   - Uses concat demuxer for fast, lossless merging
   - Extracts metadata (duration, size) for client notifications

3. **Storage Strategy Pattern**
   - `IStorageService` interface for pluggable storage
   - `LocalStorageService` for disk-based storage (active)
   - Ready for `MinIOStorageService` (future implementation)
   - Easy to switch via environment variable

4. **WebSocket Notifications**
   - Real-time notifications when recording is ready
   - Progress updates during merge (future enhancement)
   - Error notifications for better user experience

5. **REST API**
   - Download endpoint for retrieving merged videos
   - Status endpoint for checking recording availability

## File Structure

```
src/
├── config/
│   └── storage.config.ts          # Storage configuration
├── intergrations/
│   ├── redis/
│   │   ├── redis.module.ts
│   │   └── redis.service.ts        # Redis chunk indexing
│   ├── storage/
│   │   ├── storage.interface.ts    # Storage interface
│   │   └── local-storage.service.ts # Local disk storage
│   ├── ffmpeg/
│   │   ├── ffmpeg.module.ts
│   │   └── ffmpeg.service.ts       # Video merging
│   └── notification/
│       ├── notification.module.ts
│       └── notification.service.ts  # WebSocket notifications
└── modules/
    └── recording/
        ├── recording.module.ts      # DI configuration
        ├── recording.gateway.ts     # WebSocket gateway
        ├── recording.service.ts     # Business logic
        └── recording.controller.ts  # REST API
```

## Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Storage Configuration
STORAGE_TYPE=LOCAL                    # LOCAL or MINIO
STORAGE_LOCAL_PATH=./recordings       # Local storage directory
TEMP_DIR=./tmp                        # Temporary chunk storage
CLEANUP_CHUNKS=true                   # Clean up chunks after merge

# API Configuration
API_BASE_URL=http://localhost:3000    # Base URL for download links

# Redis Configuration
REDIS_HOST=10.8.28.51
REDIS_PORT=6379
```

## How It Works

### 1. Recording Start (`start` event)

```
Client → WebSocket → RecordingGateway → RecordingService
                                        ↓
                                   Creates temp directory
```

### 2. Chunk Upload (`chunk` event)

```
Client → WebSocket → RecordingGateway → RedisService.getNextChunkIndex()
                                        ↓ (atomic increment)
                                   RecordingService.saveChunk()
                                        ↓
                                   Save to /tmp/{recordId}/chunk-{index}.webm
```

**Key Improvement:** Redis ensures each chunk gets a unique, sequential index even in HA environments.

### 3. Recording Stop (`stop` event)

```
Client → WebSocket → RecordingGateway → RecordingService.finishRecording()
                                        ↓
                        1. FFmpeg merges all chunks → merged.webm
                        2. Extract metadata (duration, size)
                        3. Save to storage → final.webm
                        4. Cleanup temp chunks (if enabled)
                        5. Notify client via WebSocket
                                        ↓
Client ← recordingReady event with downloadUrl
```

### 4. Download

```
Client → GET /recordings/download/:key → RecordingController
                                        ↓
                                   Stream video file
```

## API Endpoints

### WebSocket Events (port 8000, namespace `/recording`)

#### Client → Server

- `start` - Start recording
  ```json
  { "recordId": "unique-id" }
  ```

- `chunk` - Upload chunk
  ```json
  { 
    "recordId": "unique-id",
    "chunk": Buffer
  }
  ```

- `stop` - Stop recording
  ```json
  { "recordId": "unique-id" }
  ```

#### Server → Client

- `started` - Recording started
  ```json
  { "recordId": "unique-id" }
  ```

- `chunkSaved` - Chunk saved
  ```json
  { 
    "recordId": "unique-id",
    "index": 0
  }
  ```

- `finished` - Recording finished (legacy)
  ```json
  { "recordId": "unique-id" }
  ```

- `recordingReady` - Recording ready for download
  ```json
  {
    "recordId": "unique-id",
    "downloadUrl": "http://localhost:3000/recordings/download/...",
    "size": 1234567,
    "duration": 120.5,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

- `recordingError` - Error during processing
  ```json
  {
    "recordId": "unique-id",
    "error": "Error message",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### REST API (port 3000)

- `GET /recordings/download/:key` - Download video
  - Returns: Video stream (video/webm)

- `GET /recordings/:recordId/status` - Check recording status
  - Returns:
    ```json
    {
      "recordId": "unique-id",
      "status": "ready|not_found|error",
      "downloadUrl": "...",
      "message": "..."
    }
    ```

## Testing

### Prerequisites

1. **Install FFmpeg**
   ```bash
   # Windows (via Chocolatey)
   choco install ffmpeg

   # macOS
   brew install ffmpeg

   # Linux
   sudo apt-get install ffmpeg
   ```

2. **Start Redis**
   ```bash
   # Already running at 10.8.28.51:6379
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env as needed
   ```

### Running the Application

```bash
# Install dependencies
npm install

# Start the server
npm run start:dev
```

### Testing the Flow

1. **Connect WebSocket Client**
   ```javascript
   const socket = io('http://localhost:8000/recording', {
     transports: ['websocket']
   });
   ```

2. **Start Recording**
   ```javascript
   socket.emit('start', { recordId: 'test-123' });
   ```

3. **Upload Chunks**
   ```javascript
   // In MediaRecorder.ondataavailable
   socket.emit('chunk', {
     recordId: 'test-123',
     chunk: event.data
   });
   ```

4. **Stop Recording**
   ```javascript
   socket.emit('stop', { recordId: 'test-123' });

   // Listen for completion
   socket.on('recordingReady', (data) => {
     console.log('Download URL:', data.downloadUrl);
     window.open(data.downloadUrl);
   });
   ```

## High Availability Considerations

### Why Redis Instead of In-Memory

**Problem with in-memory `sessionChunkIndex`:**
```
Instance 1: chunk 0, 1, 2
Instance 2: chunk 0, 1 (collision!)
```

**Solution with Redis:**
```
Instance 1: INCR recording:test-123:chunkIndex → 0
Instance 2: INCR recording:test-123:chunkIndex → 1
Instance 1: INCR recording:test-123:chunkIndex → 2
```

Each instance gets the correct sequential index regardless of load balancing.

### Shared Storage Requirements

In HA setups, you must use shared storage:

1. **Network File System (NFS)**
   - Mount same directory on all instances
   - Set `STORAGE_LOCAL_PATH=/mnt/shared/recordings`

2. **MinIO (Future)**
   - Centralized object storage
   - Set `STORAGE_TYPE=MINIO`
   - Configure MinIO endpoint

## Future Enhancements

### 1. MinIO Storage Implementation

Create `src/intergrations/storage/minio-storage.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import * as Minio from 'minio';

@Injectable()
export class MinioStorageService implements IStorageService {
  private client: Minio.Client;

  constructor(config: StorageConfig) {
    this.client = new Minio.Client({
      endPoint: config.minio.endpoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
  }

  async save(sourcePath: string, destinationKey: string): Promise<string> {
    await this.client.fPutObject(
      this.config.minio.bucket,
      destinationKey,
      sourcePath
    );
    return this.getDownloadUrl(destinationKey);
  }

  // Implement other methods...
}
```

Update `recording.module.ts`:

```typescript
{
  provide: STORAGE_SERVICE,
  useFactory: () => {
    const config = getStorageConfig();
    return config.type === 'MINIO'
      ? new MinioStorageService(config)
      : new LocalStorageService(config);
  },
}
```

### 2. Progress Notifications

In `ffmpeg.service.ts`, emit progress during merge:

```typescript
.on('progress', (progress) => {
  if (progress.percent) {
    this.notificationService.notifyMergeProgress(
      recordId,
      progress.percent
    );
  }
})
```

### 3. Database Recording Metadata

Store recording metadata in database for querying:

```typescript
interface Recording {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  size: number;
  downloadUrl: string;
  status: 'processing' | 'ready' | 'error';
}
```

## Troubleshooting

### FFmpeg Not Found

```bash
# Verify FFmpeg installation
ffmpeg -version

# Add to PATH if needed (Windows)
setx PATH "%PATH%;C:\ProgramData\chocolatey\bin"
```

### Redis Connection Error

```bash
# Test Redis connection
redis-cli -h 10.8.28.51 -p 6379 ping
```

### Chunks Not Merging

1. Check temp directory exists and is writable
2. Verify chunks are saved with correct naming: `chunk-000.webm`, `chunk-001.webm`, etc.
3. Check FFmpeg logs in console

### Download URL Not Working

1. Verify `API_BASE_URL` in `.env`
2. Check file exists in storage location
3. Ensure storage path is correct

## Performance Considerations

### Chunk Size

Recommended: 1-5 MB chunks (1-5 seconds of video)
- Too small: More overhead, more merge operations
- Too large: Network timeouts, memory issues

### Cleanup Strategy

`CLEANUP_CHUNKS=true` saves disk space but:
- Delete after successful merge
- Keep for debugging if issues occur
- Consider retention policy (e.g., delete after 24 hours)

### FFmpeg Performance

- Concat demuxer is fast (no re-encoding)
- Merge time depends on number of chunks
- Monitor memory usage for large recordings

## Security Considerations

1. **Validate recordId** - Prevent path traversal attacks
2. **Rate limiting** - Prevent abuse of upload/download
3. **Authentication** - Add user authentication
4. **Storage quotas** - Limit per-user storage
5. **Cleanup old files** - Implement retention policy

## Migration from Old System

1. Deploy new code to all instances
2. Redis should already be configured (from migration)
3. Configure environment variables
4. Test with single instance first
5. Scale to multiple instances
6. Monitor Redis chunk counters
7. Verify merged videos

## Support

For issues or questions, check:
- Application logs
- Redis logs
- FFmpeg output in console
- Network connectivity between instances and Redis
