import { User } from '../entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<User | null>;
  findByOAuthProvider(
    provider: string,
    providerId: string,
  ): Promise<User | null>;
  findAll(skip?: number, take?: number): Promise<[User[], number]>;
  create(userData: Partial<User>): Promise<User>;
  update(id: string, userData: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
  updateLastLogin(userId: string): Promise<void>;
  incrementFailedLogin(userId: string): Promise<void>;
  resetFailedLogin(userId: string): Promise<void>;
  lockAccount(userId: string, until: Date): Promise<void>;
  unlockAccount(userId: string): Promise<void>;
}
