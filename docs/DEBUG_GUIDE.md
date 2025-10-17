# Debug Configuration Guide

## Overview

This guide covers debugging the NestJS screen recorder backend application using various tools and configurations.

## VS Code Debugging

### Available Debug Configurations

#### 1. Debug NestJS App
**Launch the app in debug mode with breakpoints**

- **How to use:**
  1. Open VS Code
  2. Go to Run and Debug (Ctrl+Shift+D)
  3. Select "Debug NestJS App"
  4. Press F5 or click Start Debugging
  5. Set breakpoints in your code
  6. Application will pause at breakpoints

- **Features:**
  - Hot reload enabled
  - Full TypeScript source map support
  - Breakpoint debugging
  - Variable inspection
  - Call stack visualization

#### 2. Attach to Process
**Attach debugger to a running instance**

- **How to use:**
  1. Start app with: `npm run start:debug`
  2. In VS Code, select "Attach to Process"
  3. Press F5
  4. Debugger connects to port 9229

- **Use case:** When app is already running and you want to attach debugger

#### 3. Debug Jest Tests
**Debug all test files**

- **How to use:**
  1. Select "Debug Jest Tests"
  2. Press F5
  3. Set breakpoints in test files or source code
  4. Tests run with debugger attached

#### 4. Debug Current Test File
**Debug only the currently open test file**

- **How to use:**
  1. Open a `.spec.ts` file
  2. Select "Debug Current Test File"
  3. Press F5
  4. Only that file's tests will run with debugger

## Command Line Debugging

### Start in Debug Mode
```bash
npm run start:debug
```
- Starts app on debug port 9229
- Enables hot reload
- Shows verbose logs

### Debug with Environment
```bash
NODE_ENV=development npm run start:debug
```

### Debug on Different Port
```bash
PORT=3001 npm run start:debug
```

## Environment Configuration

### Development Environment (.env.development)
```env
NODE_ENV=development
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
LOG_LEVEL=debug
WS_PORT=8000
```

### Loading Environment Files
The app automatically loads `.env.development` when `NODE_ENV=development`.

## Logging Levels

The application uses different log levels based on environment:

### Development (Verbose)
- `log` - General information
- `error` - Error messages
- `warn` - Warning messages
- `debug` - Debug information
- `verbose` - Detailed information

### Production (Limited)
- `log` - General information
- `error` - Error messages
- `warn` - Warning messages

## Debugging Features

### 1. Application Startup Logs
When app starts in development mode, you'll see:
```
[Bootstrap] Application is running on: http://localhost:3000
[Bootstrap] Environment: development
[Bootstrap] WebSocket Gateway running on: ws://localhost:8000/recording
[Bootstrap] Debug mode enabled
[Bootstrap] Redis: localhost:6379
```

### 2. Redis Connection Logs
```
Redis connected successfully
```

### 3. WebSocket Events
```
[RecordingGateway] Connected
[RecordingGateway] Disconnected
```

## Common Debugging Scenarios

### Debug WebSocket Connections

1. **Set breakpoint in gateway:**
   ```typescript
   // src/modules/recording/recording.gateway.ts
   @SubscribeMessage('chunk')
   async handleChunk(...) {
     // Set breakpoint here
   }
   ```

2. **Start debugging:**
   - Press F5 with "Debug NestJS App" selected
   - Connect client to `ws://localhost:8000/recording`
   - Send 'chunk' event
   - Debugger pauses at breakpoint

### Debug Redis Operations

1. **Set breakpoint in Redis service:**
   ```typescript
   // src/intergrations/redis/redis.service.ts
   async getNextChunkIndex(recordId: string): Promise<number> {
     // Set breakpoint here
     const key = `recording:${recordId}:chunk_index`;
     const index = await this.client.incr(key);
     return index - 1;
   }
   ```

2. **Inspect variables:**
   - View `recordId`
   - Check Redis `key`
   - See returned `index`

### Debug Module Initialization

1. **Set breakpoint in module:**
   ```typescript
   // src/intergrations/redis/redis.service.ts
   onModuleInit() {
     // Set breakpoint here
     this.client = new Redis({...});
   }
   ```

2. **Start app** - debugger pauses during module initialization

## Debugging Tools

### Chrome DevTools
1. Start app: `npm run start:debug`
2. Open Chrome: `chrome://inspect`
3. Click "inspect" under Remote Target
4. Use Chrome DevTools for debugging

### VS Code Debug Console
- Evaluate expressions while paused
- Check variable values
- Execute code snippets

**Example:**
```javascript
// While paused at breakpoint, type in Debug Console:
data.recordId
this.redisService.getClient()
```

## Performance Debugging

### Enable Verbose Logging
Set in `.env.development`:
```env
LOG_LEVEL=verbose
```

### Monitor Redis Operations
```typescript
// Add to redis.service.ts for debugging
async getNextChunkIndex(recordId: string): Promise<number> {
  const start = Date.now();
  const key = `recording:${recordId}:chunk_index`;
  const index = await this.client.incr(key);
  console.log(`Redis INCR took ${Date.now() - start}ms`);
  return index - 1;
}
```

## Troubleshooting

### Debugger Not Attaching
1. Check port 9229 is not in use
2. Restart VS Code
3. Run `npm run start:debug` manually first
4. Try "Attach to Process" instead of "Debug NestJS App"

### Breakpoints Not Working
1. Ensure source maps are enabled (already configured)
2. Rebuild: `npm run build`
3. Check TypeScript version matches
4. Verify breakpoint is in executed code path

### Redis Connection Issues
1. Check Redis is running: `redis-cli ping`
2. Verify port in `.env.development`
3. Check Redis service logs in console
4. Test connection: `redis-cli -h localhost -p 6379`

### WebSocket Not Connecting
1. Check gateway port (default 8000)
2. Verify CORS settings in `main.ts`
3. Test with WebSocket client (wscat, Postman)
4. Check firewall settings

## Best Practices

1. **Use Breakpoints Wisely**
   - Set breakpoints on critical paths
   - Use conditional breakpoints for specific conditions
   - Remove breakpoints in production code

2. **Log Strategically**
   - Use appropriate log levels
   - Include context in log messages
   - Avoid logging sensitive data

3. **Environment Separation**
   - Keep development configs separate
   - Never commit `.env` files with secrets
   - Use `.env.example` for templates

4. **Clean Debug Sessions**
   - Stop debugger when done
   - Clear console regularly
   - Restart app to reset state

## Quick Reference

| Action | Command/Shortcut |
|--------|-----------------|
| Start debugging | F5 |
| Stop debugging | Shift+F5 |
| Step over | F10 |
| Step into | F11 |
| Step out | Shift+F11 |
| Continue | F5 |
| Toggle breakpoint | F9 |
| Debug console | Ctrl+Shift+Y |

## Additional Resources

- [NestJS Debugging Docs](https://docs.nestjs.com/)
- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
