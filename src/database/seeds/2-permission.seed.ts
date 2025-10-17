import { DataSource } from 'typeorm';
import { Permission } from '../../modules/role/entities/permission.entity';

export async function seedPermissions(dataSource: DataSource): Promise<void> {
  const permissionRepository = dataSource.getRepository(Permission);

  const permissions = [
    // User Management
    {
      name: 'users:create',
      resource: 'users',
      action: 'create',
      description: 'Create new users',
    },
    {
      name: 'users:read',
      resource: 'users',
      action: 'read',
      description: 'View user information',
    },
    {
      name: 'users:update',
      resource: 'users',
      action: 'update',
      description: 'Update user information',
    },
    {
      name: 'users:delete',
      resource: 'users',
      action: 'delete',
      description: 'Delete users',
    },

    // Role Management
    {
      name: 'roles:create',
      resource: 'roles',
      action: 'create',
      description: 'Create new roles',
    },
    {
      name: 'roles:read',
      resource: 'roles',
      action: 'read',
      description: 'View roles',
    },
    {
      name: 'roles:update',
      resource: 'roles',
      action: 'update',
      description: 'Update roles',
    },
    {
      name: 'roles:delete',
      resource: 'roles',
      action: 'delete',
      description: 'Delete roles',
    },

    // Permission Management
    {
      name: 'permissions:create',
      resource: 'permissions',
      action: 'create',
      description: 'Create new permissions',
    },
    {
      name: 'permissions:read',
      resource: 'permissions',
      action: 'read',
      description: 'View permissions',
    },
    {
      name: 'permissions:update',
      resource: 'permissions',
      action: 'update',
      description: 'Update permissions',
    },
    {
      name: 'permissions:delete',
      resource: 'permissions',
      action: 'delete',
      description: 'Delete permissions',
    },

    // Recording Management
    {
      name: 'recordings:create',
      resource: 'recordings',
      action: 'create',
      description: 'Create recordings',
    },
    {
      name: 'recordings:read',
      resource: 'recordings',
      action: 'read',
      description: 'View recordings',
    },
    {
      name: 'recordings:update',
      resource: 'recordings',
      action: 'update',
      description: 'Update recordings',
    },
    {
      name: 'recordings:delete',
      resource: 'recordings',
      action: 'delete',
      description: 'Delete recordings',
    },

    // System
    {
      name: 'system:settings',
      resource: 'system',
      action: 'settings',
      description: 'Manage system settings',
    },
  ];

  for (const permissionData of permissions) {
    const existingPermission = await permissionRepository.findOne({
      where: { name: permissionData.name },
    });

    if (!existingPermission) {
      const permission = permissionRepository.create(permissionData);
      await permissionRepository.save(permission);
      console.log(`✓ Created permission: ${permissionData.name}`);
    } else {
      console.log(`- Permission already exists: ${permissionData.name}`);
    }
  }
}
