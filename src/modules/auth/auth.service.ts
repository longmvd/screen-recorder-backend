import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../user/repositories/user.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  JwtPayload,
  AuthTokens,
} from '../../core/auth/interfaces/jwt-payload.interface';
import * as bcrypt from 'bcrypt';
import { getJwtConfig, getJwtRefreshConfig } from '../../config/jwt.config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findByEmail(
      registerDto.email,
    );
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

    const tokens = this.generateTokens(user.id, user.email, user.roles);

    delete user.password;
    return { user, ...tokens };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findByEmailWithPassword(
      loginDto.email,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is locked');
    }

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      await this.userRepository.incrementFailedLogin(user.id);

      if (user.failedLoginAttempts >= 4) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        await this.userRepository.lockAccount(user.id, lockUntil);
        throw new UnauthorizedException(
          'Account locked due to multiple failed attempts',
        );
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.resetFailedLogin(user.id);
    await this.userRepository.updateLastLogin(user.id);

    const tokens = this.generateTokens(user.id, user.email, user.roles);

    delete user.password;
    return { user, ...tokens };
  }

  async validateOAuthUser(
    provider: string,
    providerId: string,
    email: string,
    profileData: any,
  ) {
    let user = await this.userRepository.findByOAuthProvider(
      provider,
      providerId,
    );

    if (!user) {
      user = await this.userRepository.findByEmail(email);

      if (!user) {
        user = await this.userRepository.create({
          email,
          emailVerified: true,
          roles: ['user'],
          oauthProviders: [
            {
              provider,
              providerId,
              providerData: profileData,
            },
          ] as any,
          profile: {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            avatar: profileData.avatar,
          } as any,
        });
      }
    }

    const tokens = this.generateTokens(user.id, user.email, user.roles);
    return { user, ...tokens };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const refreshConfig = getJwtRefreshConfig();

      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshConfig.secret,
      });

      // Get user from database
      const user = await this.userRepository.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      if (user.lockedUntil && new Date() < user.lockedUntil) {
        throw new UnauthorizedException('Account is temporarily locked');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user.id, user.email, user.roles);

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private generateTokens(
    userId: string,
    email: string,
    roles: string[],
  ): AuthTokens {
    const payload: JwtPayload = {
      sub: userId,
      email,
      roles,
    };

    const jwtConfig = getJwtConfig();
    const refreshConfig = getJwtRefreshConfig();

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.signOptions.expiresIn,
    });

    const refreshToken = this.jwtService.sign(
      { sub: userId, email, tokenId: Date.now().toString() },
      {
        secret: refreshConfig.secret,
        expiresIn: refreshConfig.signOptions.expiresIn,
      },
    );

    return { accessToken, refreshToken };
  }
}
