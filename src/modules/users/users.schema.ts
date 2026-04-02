// src/modules/users/users.schema.ts

import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

export const updateRoleSchema = z.object({
  role: z.nativeEnum(Role, { errorMap: () => ({ message: 'Role must be VIEWER, ANALYST, or ADMIN' }) }),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus, { errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }) }),
});

export const listUsersQuerySchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  role:   z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  search: z.string().optional(),
});

export type UpdateRoleInput   = z.infer<typeof updateRoleSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListUsersQuery    = z.infer<typeof listUsersQuerySchema>;
