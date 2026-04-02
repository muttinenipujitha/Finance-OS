// tests/helpers.ts

import { prisma } from '../src/config/database';
import { AuthService } from '../src/modules/auth/auth.service';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const authService = new AuthService();

export async function cleanDb() {
  await prisma.refreshToken.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(role: Role = 'VIEWER') {
  const password = await bcrypt.hash('Password123!', 10);
  return prisma.user.create({
    data: {
      email: `${role.toLowerCase()}-${Date.now()}@test.com`,
      password,
      name: `Test ${role}`,
      role,
    },
  });
}

export async function loginAs(role: Role = 'ADMIN') {
  const user = await createTestUser(role);
  const tokens = await authService['generateTokenPair'](user.id, user.email, user.role);
  return { user, ...tokens };
}
