import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_oauth_providers')
export class UserOAuthProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.oauthProviders)
  user: User;

  @Column()
  provider: string; // 'google', 'facebook', 'github'

  @Column()
  providerId: string;

  @Column({ type: 'json', nullable: true })
  providerData: Record<string, any>;

  @CreateDateColumn()
  connectedAt: Date;
}
