import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // 'recording:create', 'recording:delete', 'user:manage'

  @Column()
  resource: string; // 'recording', 'user', 'role'

  @Column()
  action: string; // 'create', 'read', 'update', 'delete', 'manage'

  @Column()
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
