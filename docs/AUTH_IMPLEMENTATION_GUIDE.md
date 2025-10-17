# Authentication System Implementation Guide

This guide provides the complete implementation for the authentication system with JWT, OAuth, and RBAC.

## Overview

The authentication system has been partially implemented. The following components are complete:

### ✅ Completed Components

1. **Configuration Files**
   - `src/config/database.config.ts` - Database configuration
   - `src/config/jwt.config.ts` - JWT configuration
   - `src/config/oauth.config.ts` - OAuth providers configuration
   - `.env.example` - Updated with all required environment variables

2. **Database Entities**
   - `src/modules/user/entities/user.entity.ts` - User entity
   - `src/modules/user/entities/user-profile.entity.ts` - User profile
   - `src/modules/user/entities/user-oauth-provider.entity.ts` - OAuth providers
   - `src/modules/role/entities/role.entity.ts` - Role entity
   - `src/modules/role/entities/permission.entity.ts` - Permission entity

3. **Repository Pattern**
   - `src/modules/user/repositories/user.repository.interface.ts`
   - `src/modules/user/repositories/user.repository.ts`
   - `src/modules/role/repositories/role.repository.interface.ts`
   - `src/modules/role/repositories/role.repository.ts`

4. **Core Auth Infrastructure**
   - `src/core/database/database.module.ts` - Database module
   - `src/core/auth/interfaces/jwt-payload.interface.ts` - JWT interfaces
   - `src/core/auth/strategies/jwt.strategy.ts` - JWT strategy
   - `src/core/auth/guards/jwt-auth.guard.ts` - JWT guard
   - `src/core/auth/guards/roles.guard.ts` - Role-based guard
   - `src/core/auth/decorators/public.decorator.ts` - Public route decorator
   - `src/core/auth/decorators/current-user.decorator.ts` - Current user decorator
   - `src/core/auth/decorators/roles.decorator.ts` - Roles decorator

### 🚧 Remaining Implementation

The following files need to be created to complete the system:

## Step 1: Create User Module Files

### 1.1 User DTOs

Create `src/modules/user/dto/create-user.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}
```

Create `src/modules/user/dto/update-user.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  language?: string;
}
```

### 1.2 User Service

Create `src/modules/user/user.service.ts`:
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    const user = await this.userRepository.create({
      email: createUserDto.email,
      username: createUserDto.username,
      password: hashedPassword,
      roles: ['user'],
      profile: {
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
      } as any,
    });

    delete user.password;
    return user;
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await this.userRepository.findAll(skip, limit);
    
    return {
      data: users.map(u => {
        delete u.password;
        return u;
      }),
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    delete user.password;
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.userRepository.update(id, {
      username: updateUserDto.username,
      profile: {
        ...user.profile,
        ...updateUserDto,
      } as any,
    });

    delete updated.password;
    return updated;
  }

  async remove(id: string) {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }
}
```

### 1.3 User Controller

Create `src/modules/user/user.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../core/auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('admin')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Roles('admin')
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.userService.findAll(page, limit);
  }

  @Get('me')
  getProfile(@CurrentUser() user: CurrentUserData) {
    return this.userService.findOne(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
```

### 1.4 User Module

Create `src/modules/user/user.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UserOAuthProvider } from './entities/user-oauth-provider.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile, UserOAuthProvider])],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
```

## Step 2: Create Auth Module Files

### 2.1 Auth DTOs

Create `src/modules/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

Create `src/modules/auth/dto/register.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}
```

### 2.2 Auth Service

Create `src/modules/auth/auth.service.ts`:
```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../user/repositories/user.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload, AuthTokens } from '../../core/auth/interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';
import { getJwtConfig, getJwtRefreshConfig } from '../../config/jwt.config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    
    const user = await this.userRepository.create({
      email: registerDto.email,
      username: registerDto.username,
      password: hashedPassword,
      roles: ['user'],
      profile: {
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      } as any,
    });

    const tokens = await this.generateTokens(user.id, user.email, user.roles);
    
    delete user.password;
    return { user, ...tokens };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findByEmailWithPassword(loginDto.email);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is locked');
    }

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    
    if (!isPasswordValid) {
      await this.userRepository.incrementFailedLogin(user.id);
      
      if (user.failedLoginAttempts >= 4) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        await this.userRepository.lockAccount(user.id, lockUntil);
        throw new UnauthorizedException('Account locked due to multiple failed attempts');
      }
      
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.resetFailedLogin(user.id);
    await this.userRepository.updateLastLogin(user.id);
    
    const tokens = await this.generateTokens(user.id, user.email, user.roles);
    
    delete user.password;
    return { user, ...tokens };
  }

  async validateOAuthUser(provider: string, providerId: string, email: string, profileData: any) {
    let user = await this.userRepository.findByOAuthProvider(provider, providerId);
    
    if (!user) {
      user = await this.userRepository.findByEmail(email);
      
      if (!user) {
        user = await this.userRepository.create({
          email,
          emailVerified: true,
          roles: ['user'],
          oauthProviders: [{
            provider,
            providerId,
            providerData: profileData,
          }] as any,
          profile: {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            avatar: profileData.avatar,
          } as any,
        });
      }
    }

    const tokens = await this.generateTokens(user.id, user.email, user.roles);
    return { user, ...tokens };
  }

  private async generateTokens(userId: string, email: string, roles: string[]): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      roles,
    };

    const accessToken = this.jwtService.sign(payload, getJwtConfig());
    const refreshToken = this.jwtService.sign(
      { sub: userId, email, tokenId: Date.now().toString() },
      getJwtRefreshConfig(),
    );

    return { accessToken, refreshToken };
  }
}
```

### 2.3 Local Strategy

Create `src/modules/auth/strategies/local.strategy.ts`:
```typescript
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const result = await this.authService.login({ email, password });
    if (!result) {
      throw new UnauthorizedException();
    }
    return result;
  }
}
```

### 2.4 OAuth Strategies

Create `src/modules/auth/strategies/google.strategy.ts`:
```typescript
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { getGoogleOAuthConfig } from '../../../config/oauth.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super(getGoogleOAuthConfig());
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, name, photos } = profile;
    
    const result = await this.authService.validateOAuthUser(
      'google',
      id,
      emails[0].value,
      {
        firstName: name.givenName,
        lastName: name.familyName,
        avatar: photos[0].value,
      },
    );

    done(null, result);
  }
}
```

Create `src/modules/auth/strategies/facebook.strategy.ts`:
```typescript
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { getFacebookOAuthConfig } from '../../../config/oauth.config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private authService: AuthService) {
    super(getFacebookOAuthConfig());
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { id, emails, name, photos } = profile;
    
    const result = await this.authService.validateOAuthUser(
      'facebook',
      id,
      emails[0].value,
      {
        firstName: name.givenName,
        lastName: name.familyName,
        avatar: photos[0].value,
      },
    );

    done(null, result);
  }
}
```

### 2.5 Auth Controller

Create `src/modules/auth/auth.controller.ts`:
```typescript
import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../../core/auth/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Initiates Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthCallback(@Req() req: any) {
    return req.user;
  }

  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth() {
    // Initiates Facebook OAuth flow
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  facebookAuthCallback(@Req() req: any) {
    return req.user;
  }
}
```

### 2.6 Auth Module

Create `src/modules/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtStrategy } from '../../core/auth/strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { getJwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register(getJwtConfig()),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    FacebookStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

## Step 3: Update App Module

Update `src/app.module.ts` to include the new modules:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './core/database/database.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { RecordingModule } from './modules/recording/recording.module';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { RolesGuard } from './core/auth/guards/roles.guard';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UserModule,
    RecordingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Apply JWT guard globally
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Apply roles guard globally
    },
  ],
})
export class AppModule {}
```

## Step 4: Install Validation Package

```bash
npm install class-validator class-transformer
```

## Step 5: Enable Validation in main.ts

Update `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
```

## Step 6: Setup Database

1. Create a MySQL database:
```sql
CREATE DATABASE screen_recorder;
```

2. Update `.env.development` with your database credentials:
```env
DATABASE_TYPE=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=screen_recorder
DATABASE_SYNC=true
DATABASE_LOGGING=true
```

3. Run the application to auto-create tables (thanks to `synchronize: true` in development):
```bash
npm run start:dev
```

## Step 7: Test the Authentication

### Register a new user:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Access protected route:
```bash
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## OAuth Setup

### Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Update `.env` with client ID and secret

### Facebook OAuth:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Set redirect URI: `http://localhost:3000/auth/facebook/callback`
5. Update `.env` with app ID and secret

## Security Best Practices

1. **Never commit `.env` files** - they contain sensitive data
2. **Use strong JWT secrets** in production
3. **Enable HTTPS** in production
4. **Set `DATABASE_SYNC=false`** in production
5. **Use migrations** for production database changes
6. **Implement rate limiting** for auth endpoints
7
