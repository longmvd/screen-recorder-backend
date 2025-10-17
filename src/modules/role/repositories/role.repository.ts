import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { IRoleRepository } from './role.repository.interface';

@Injectable()
export class RoleRepository implements IRoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async findById(id: string): Promise<Role | null> {
    return this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepo.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  async create(roleData: Partial<Role>): Promise<Role> {
    const role = this.roleRepo.create(roleData);
    return this.roleRepo.save(role);
  }

  async update(id: string, roleData: Partial<Role>): Promise<Role> {
    await this.roleRepo.update(id, roleData);
    const role = await this.findById(id);
    if (!role) {
      throw new Error('Role not found after update');
    }
    return role;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.roleRepo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async addPermission(roleId: string, permissionId: string): Promise<void> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
    const permission = await this.permissionRepo.findOne({
      where: { id: permissionId },
    });

    if (!role || !permission) {
      throw new Error('Role or Permission not found');
    }

    role.permissions.push(permission);
    await this.roleRepo.save(role);
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new Error('Role not found');
    }

    role.permissions = role.permissions.filter((p) => p.id !== permissionId);
    await this.roleRepo.save(role);
  }

  async getPermissions(roleId: string): Promise<Permission[]> {
    const role = await this.findById(roleId);
    return role?.permissions ?? [];
  }
}
