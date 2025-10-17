# Refresh Token Implementation Guide

## Overview

This project implements a secure token refresh mechanism using JWT (JSON Web Tokens) to maintain user sessions without requiring frequent re-authentication.

## Token Types

### Access Token
- **Lifespan:** 15 minutes
- **Purpose:** Authenticate API requests
- **Storage:** Memory or localStorage (client-side)
- **Usage:** Sent in `Authorization: Bearer <token>` header

### Refresh Token
- **Lifespan:** 7 days
- **Purpose:** Obtain new access tokens
- **Storage:** Secure httpOnly cookie or encrypted localStorage
- **Usage:** Sent to `/auth/refresh` endpoint only

## Why Use Refresh Tokens?

### Security Benefits

1. **Limited Exposure Window**
   - If an access token is stolen, it only works for 15 minutes
   - Reduces attack surface significantly

2. **Controlled Session Management**
   - Can revoke refresh tokens to force re-authentication
   - Track active sessions across devices

3. **Token Rotation**
   - Each refresh generates new tokens
   - Can detect and prevent token reuse attacks

4. **Audit Trail**
   - Log when users refresh their sessions
   - Monitor suspicious refresh patterns

## Implementation Details

### Backend Components

#### 1. Refresh Token DTO
**File:** `src/modules/auth/dto/refresh-token.dto.ts`

```typescript
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token obtained from login or register',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

#### 2. Auth Service Method
**File:** `src/modules/auth/auth.service.ts`

```typescript
async refreshTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    const refreshConfig = getJwtRefreshConfig();

    // Verify the refresh token
    const payload = this.jwtService.verify(refreshToken, {
      secret: refreshConfig.secret,
    });

    // Get user from database
    const user = await this.userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    // Generate new tokens
    return this.generateTokens(user.id, user.email, user.roles);
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    throw new UnauthorizedException('Invalid or expired refresh token');
  }
}
```

#### 3. Auth Controller Endpoint
**File:** `src/modules/auth/auth.controller.ts`

```typescript
@Public()
@Post('refresh')
@ApiOperation({
  summary: 'Refresh access token',
  description: 'Use a valid refresh token to obtain new tokens',
})
refresh(@Body() refreshTokenDto: RefreshTokenDto) {
  return this.authService.refreshTokens(refreshTokenDto.refreshToken);
}
```

### Configuration

**File:** `src/config/jwt.config.ts`

```typescript
export const getJwtConfig = () => ({
  secret: process.env.JWT_SECRET || 'your-secret',
  signOptions: {
    expiresIn: '15m',  // Access token: 15 minutes
  },
});

export const getJwtRefreshConfig = () => ({
  secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
  signOptions: {
    expiresIn: '7d',  // Refresh token: 7 days
  },
});
```

**Environment Variables:**
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d
```

## Client-Side Integration

### Basic Flow

```javascript
// 1. Login and store tokens
async function login(email, password) {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  // Store tokens
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  
  return data;
}

// 2. Make authenticated requests
async function apiRequest(url, options = {}) {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  // If token expired, refresh and retry
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest(url, options); // Retry with new token
    }
  }

  return response;
}

// 3. Refresh token function
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    // No refresh token, redirect to login
    window.location.href = '/login';
    return false;
  }

  try {
    const response = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Refresh failed');
    }

    const data = await response.json();
    
    // Store new tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    
    return true;
  } catch (error) {
    // Refresh failed, redirect to login
    localStorage.clear();
    window.location.href = '/login';
    return false;
  }
}
```

### React Example with Axios

```javascript
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Request interceptor - add access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          'http://localhost:3000/auth/refresh',
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Testing the Refresh Endpoint

### Using cURL

```bash
# 1. Login first
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Response will include:
# {
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc...",
#   "user": {...}
# }

# 2. Use refresh token to get new access token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'

# Response:
# {
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "eyJhbGc..."
# }
```

### Using Swagger UI

1. Navigate to http://localhost:3000/api/docs
2. Use `/auth/login` to get tokens
3. Copy the `refreshToken` from the response
4. Go to `/auth/refresh` endpoint
5. Click "Try it out"
6. Paste the refresh token in the request body
7. Click "Execute"

### Using Postman

1. **Login Request:**
   - Method: POST
   - URL: `http://localhost:3000/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "user@example.com",
       "password": "password123"
     }
     ```

2. **Refresh Request:**
   - Method: POST
   - URL: `http://localhost:3000/auth/refresh`
   - Body (JSON):
     ```json
     {
       "refreshToken": "<paste-refresh-token-here>"
     }
     ```

## Security Best Practices

### 1. Token Storage

**Recommended Approaches:**

- **httpOnly Cookies** (Best for web apps):
  ```typescript
  // Set refresh token as httpOnly cookie
  response.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  ```

- **Secure localStorage** (Alternative):
  - Encrypt tokens before storing
  - Clear on logout
  - Use with caution (vulnerable to XSS)

**Avoid:**
- Regular localStorage without encryption
- URL parameters
- SessionStorage for refresh tokens

### 2. Token Rotation

Implement token rotation for enhanced security:

```typescript
async refreshTokens(refreshToken: string): Promise<AuthTokens> {
  // Verify and get payload
  const payload = this.jwtService.verify(refreshToken, {...});
  
  // Optional: Track token usage in database
  await this.tokenService.markTokenAsUsed(payload.tokenId);
  
  // Generate new tokens with new tokenId
  const newTokens = this.generateTokens(user.id, user.email, user.roles);
  
  // Optional: Invalidate old refresh token
  await this.tokenService.revokeToken(refreshToken);
  
  return newTokens;
}
```

### 3. Token Revocation

Store active refresh tokens in database/Redis:

```typescript
// On login
await redis.set(
  `refresh_token:${userId}:${tokenId}`,
  refreshToken,
  'EX',
  7 * 24 * 60 * 60 // 7 days
);

// On logout
await redis.del(`refresh_token:${userId}:${tokenId}`);

// On refresh, verify token exists
const exists = await redis.exists(`refresh_token:${userId}:${tokenId}`);
if (!exists) {
  throw new UnauthorizedException('Token revoked');
}
```

### 4. Detection of Token Reuse

```typescript
async refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const tokenId = payload.tokenId;
  
  // Check if token was already used
  const wasUsed = await redis.get(`used_token:${tokenId}`);
  if (wasUsed) {
    // Token reuse detected - revoke all user tokens
    await this.revokeAllUserTokens(payload.sub);
    throw new UnauthorizedException('Token reuse detected');
  }
  
  // Mark as used
  await redis.set(`used_token:${tokenId}`, 'true', 'EX', 3600);
  
  // Continue with token refresh...
}
```

## Troubleshooting

### Common Issues

#### 1. "Invalid or expired refresh token"

**Causes:**
- Refresh token actually expired (> 7 days)
- Wrong refresh token secret
- Token format invalid

**Solutions:**
- Check token expiration
- Verify `JWT_REFRESH_SECRET` in .env
- User must login again

#### 2. "User not found"

**Causes:**
- User deleted from database
- User ID in token doesn't match any user

**Solutions:**
- Clear tokens and redirect to login
- Verify database state

#### 3. "Account is temporarily locked"

**Causes:**
- Too many failed login attempts
- Manual account lock by admin

**Solutions:**
- Wait for lock period to expire
- Contact admin to unlock account

## Future Enhancements

### Recommended Improvements

1. **Database Storage**
   - Store refresh tokens in database
   - Track token usage history
   - Enable multi-device session management

2. **Token Rotation**
   - Automatic rotation on each refresh
   - Invalidate old refresh tokens

3. **Session Management**
   - View active sessions
   - Revoke specific sessions
   - Logout from all devices

4. **Security Monitoring**
   - Log refresh token usage
   - Alert on suspicious patterns
   - Rate limiting on refresh endpoint

5. **Token Blacklisting**
   - Immediate token revocation
   - Store blacklisted tokens in Redis
   - Automatic cleanup of expired tokens

## API Reference

### POST /auth/refresh

Refresh access token using a valid refresh token.

**Endpoint:** `POST /auth/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- **401 Unauthorized:** Invalid or expired refresh token
- **401 Unauthorized:** User not found
- **401 Unauthorized:** Account is inactive
- **401 Unauthorized:** Account is temporarily locked

## Summary

✅ Refresh token endpoint implemented  
✅ 15-minute access tokens for security  
✅ 7-day refresh tokens for convenience  
✅ Comprehensive error handling  
✅ Swagger documentation included  
✅ Client-side integration examples provided  

**Endpoint:** `POST /auth/refresh`  
**Documentation:** http://localhost:3000/api/docs
