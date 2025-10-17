import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { IUserRepository } from './user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: ['profile', 'oauthProviders'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      relations: ['profile', 'oauthProviders'],
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .addSelect('user.password')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.oauthProviders', 'oauthProviders')
      .getOne();
  }

  async findByOAuthProvider(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.oauthProviders', 'oauth')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('oauth.provider = :provider', { provider })
      .andWhere('oauth.providerId = :providerId', { providerId })
      .getOne();
  }

  async findAll(skip = 0, take = 10): Promise<[User[], number]> {
    return this.userRepo.findAndCount({
      skip,
      take,
      relations: ['profile'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepo.create(userData);
    return this.userRepo.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.userRepo.update(id, userData);
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found after update');
    }
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepo.update(userId, { lastLoginAt: new Date() });
  }

  async incrementFailedLogin(userId: string): Promise<void> {
    await this.userRepo.increment({ id: userId }, 'failedLoginAttempts', 1);
  }

  async resetFailedLogin(userId: string): Promise<void> {
    await this.userRepo.update(userId, { failedLoginAttempts: 0 });
  }

  async lockAccount(userId: string, until: Date): Promise<void> {
    await this.userRepo.update(userId, { lockedUntil: until });
  }

  async unlockAccount(userId: string): Promise<void> {
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({
        lockedUntil: () => 'NULL',
        failedLoginAttempts: 0,
      })
      .where('id = :userId', { userId })
      .execute();
  }
}
