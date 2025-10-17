import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

export interface IRoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  create(roleData: Partial<Role>): Promise<Role>;
  update(id: string, roleData: Partial<Role>): Promise<Role>;
  delete(id: string): Promise<boolean>;
  addPermission(roleId: string, permissionId: string): Promise<void>;
  removePermission(roleId: string, permissionId: string): Promise<void>;
  getPermissions(roleId: string): Promise<Permission[]>;
}
