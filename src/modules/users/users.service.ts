// src/modules/users/users.service.ts

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/response';
import type { UpdateRoleInput, UpdateStatusInput, ListUsersQuery } from './users.schema';

// Fields we always return — never expose the password hash
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class UsersService {
  async list(query: ListUsersQuery) {
    const { page, limit, role, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role   && { role }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({ where, select: USER_SELECT, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    return { users, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });
    if (!user) throw new AppError(404, 'User not found.');
    return user;
  }

  async updateRole(id: string, input: UpdateRoleInput, requestingUserId: string) {
    if (id === requestingUserId) {
      throw new AppError(403, 'You cannot change your own role.');
    }
    await this.findById(id);
    return prisma.user.update({
      where: { id },
      data:  { role: input.role },
      select: USER_SELECT,
    });
  }

  async updateStatus(id: string, input: UpdateStatusInput, requestingUserId: string) {
    if (id === requestingUserId) {
      throw new AppError(403, 'You cannot change your own status.');
    }
    await this.findById(id);
    return prisma.user.update({
      where: { id },
      data:  { status: input.status },
      select: USER_SELECT,
    });
  }

  async softDelete(id: string, requestingUserId: string) {
    if (id === requestingUserId) {
      throw new AppError(403, 'You cannot delete your own account.');
    }
    await this.findById(id);
    return prisma.user.update({
      where: { id },
      data:  { deletedAt: new Date() },
      select: USER_SELECT,
    });
  }
}
