# Swagger API Documentation Guide

## Overview

This project includes comprehensive Swagger/OpenAPI documentation for the Screen Recorder Backend API. The documentation is **only available in development mode** for security purposes.

## Accessing Swagger UI

### Development Environment

1. Start the development server:
   ```bash
   npm run start:dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000/api/docs
   ```

3. You should see the interactive Swagger UI with all API endpoints documented.

### Production Environment

⚠️ **Swagger is intentionally disabled in production** for security and performance reasons.

---

## Features

### 📚 Interactive Documentation

- **Try It Out**: Test endpoints directly from the browser
- **Request/Response Examples**: View example payloads for each endpoint
- **Schema Definitions**: Detailed DTO and entity schemas
- **Authentication Testing**: Test authenticated endpoints with JWT tokens

### 🔒 Authentication

1. **Register or Login**: Use `/auth/register` or `/auth/login` to obtain a JWT token
2. **Authorize**: Click the "Authorize" button (🔓) at the top right
3. **Enter Token**: Paste your JWT token (without "Bearer" prefix)
4. **Test Endpoints**: All subsequent requests will include the token

### 📋 API Tags

The API is organized into logical groups:

- **Authentication** - Registration, login, OAuth endpoints
- **Users** - User management (CRUD operations)
- **Recordings** - Recording download and status checking

---

## Available Endpoints

### Authentication Endpoints

#### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "username": "john_doe",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "john_doe",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST `/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "MySecurePassword123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "john_doe"
  }
}
```

#### POST `/auth/refresh`
Refresh access token using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**When to use:**
- When your access token expires (after 15 minutes)
- To maintain user session without requiring re-login
- Refresh token is valid for 7 days

#### GET `/auth/google`
Initiate Google OAuth authentication flow.

#### GET `/auth/facebook`
Initiate Facebook OAuth authentication flow.

---

### User Endpoints

#### GET `/users/me`
Get the current authenticated user's profile.

**Requires:** JWT Authentication

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "john_doe",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890"
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### GET `/users`
Get all users with pagination (Admin only).

**Requires:** JWT Authentication + Admin Role

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

#### POST `/users`
Create a new user (Admin only).

**Requires:** JWT Authentication + Admin Role

#### GET `/users/:id`
Get user by ID.

**Requires:** JWT Authentication

#### PATCH `/users/:id`
Update user information.

**Requires:** JWT Authentication

#### DELETE `/users/:id`
Delete a user (Admin only).

**Requires:** JWT Authentication + Admin Role

---

### Recording Endpoints

#### GET `/recordings/download/:key`
Download a recorded video file.

**Parameters:**
- `key`: Recording storage key (URL encoded)

**Response:** Video file stream (video/webm)

#### GET `/recordings/:recordId/status`
Check if a recording is ready for download.

**Parameters:**
- `recordId`: Recording identifier

**Response:**
```json
{
  "recordId": "abc123",
  "status": "ready",
  "downloadUrl": "/recordings/download/abc123%2Ffinal.webm"
}
```

---

## WebSocket API

For real-time recording functionality, see the [WebSocket API Documentation](./WEBSOCKET_API.md).

**WebSocket Endpoint:** `ws://localhost:8000/recording`

---

## Swagger Configuration

### Location
`src/main.ts` - Lines 41-78

### Configuration Options

```typescript
const config = new DocumentBuilder()
  .setTitle('Screen Recorder API')
  .setDescription('API documentation...')
  .setVersion('1.0')
  .addBearerAuth({
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    name: 'JWT',
    description: 'Enter JWT token',
    in: 'header',
  }, 'JWT-auth')
  .addTag('Authentication', 'Authentication endpoints')
  .addTag('Users', 'User management endpoints')
  .addTag('Recordings', 'Recording endpoints')
  .build();
```

### Swagger Options

```typescript
SwaggerModule.setup('api/docs', app, document, {
  swaggerOptions: {
    persistAuthorization: true,  // Remembers JWT token
  },
});
```

---

## DTO Documentation

All Data Transfer Objects (DTOs) are documented with `@ApiProperty` decorators:

### Example: LoginDto

```typescript
export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'MySecurePassword123!',
    type: String,
    minLength: 6,
  })
  @IsString()
  password: string;
}
```

---

## Controller Documentation

All controllers are documented with:
- `@ApiTags()` - Group endpoints
- `@ApiOperation()` - Describe operation
- `@ApiResponse()` - Document responses
- `@ApiBearerAuth()` - Indicate JWT required
- `@ApiParam()` - Document path parameters
- `@ApiQuery()` - Document query parameters
- `@ApiBody()` - Document request body

### Example: UserController

```typescript
@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController {
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    schema: { example: { ... } }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: CurrentUserData) {
    return this.userService.findOne(user.userId);
  }
}
```

---

## Customization

### Change Swagger Path

Edit `src/main.ts`:

```typescript
SwaggerModule.setup('docs', app, document);  // Change 'api/docs' to 'docs'
```

Access at: `http://localhost:3000/docs`

### Add New Tags

Edit `src/main.ts`:

```typescript
.addTag('NewTag', 'Description of new tag')
```

### Enable in Production (Not Recommended)

Remove the `if (isDevelopment)` check in `src/main.ts`.

⚠️ **Warning:** This exposes your API structure publicly!

---

## Troubleshooting

### Swagger UI Not Loading

**Problem:** Cannot access http://localhost:3000/api/docs

**Solutions:**
1. Verify `NODE_ENV` is not set to 'production'
2. Check that the server started successfully
3. Look for Swagger initialization message in logs:
   ```
   [Bootstrap] 📚 Swagger Documentation: http://localhost:3000/api/docs
   ```

### Missing Endpoints

**Problem:** Some endpoints don't appear in Swagger

**Solutions:**
1. Ensure controllers are decorated with `@ApiTags()`
2. Check that DTOs have `@ApiProperty()` decorators
3. Restart the development server

### Authentication Not Working

**Problem:** Cannot test authenticated endpoints

**Solutions:**
1. Login via `/auth/login` to get a token
2. Click "Authorize" button (🔓) at top right
3. Enter **only the token** (not "Bearer <token>")
4. Click "Authorize" in the dialog

---

## JSON/YAML Export

### JSON Schema
Access the OpenAPI schema in JSON format:
```
http://localhost:3000/api/docs-json
```

### YAML Schema
Access the OpenAPI schema in YAML format:
```
http://localhost:3000/api/docs-yaml
```

These can be imported into tools like Postman, Insomnia, or used for API client generation.

---

## Best Practices

1. **Keep Documentation Updated**: When adding new endpoints, always add Swagger decorators
2. **Provide Examples**: Include realistic examples in `@ApiProperty()` and `@ApiResponse()`
3. **Document Error Cases**: Include all possible error responses (400, 401, 403, 404, etc.)
4. **Use Descriptive Summaries**: Make `@ApiOperation()` summaries clear and concise
5. **Group Logically**: Use `@ApiTags()` to organize related endpoints
6. **Security First**: Keep Swagger disabled in production

---

## Additional Resources

- [NestJS Swagger Module](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)

---

## Summary

✅ Swagger documentation is fully configured  
✅ Available only in development mode  
✅ All endpoints documented with examples  
✅ JWT authentication supported  
✅ Interactive API testing enabled  
✅ WebSocket documentation provided separately  

**Access:** http://localhost:3000/api/docs (development only)
