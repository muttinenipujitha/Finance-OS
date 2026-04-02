// src/modules/auth/auth.service.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import type { RegisterInput, LoginInput } from './auth.schema';
import type { JwtPayload } from '../../middleware/authenticate';

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError(409, 'An account with that email already exists.', 'CONFLICT');
    }

    const hashed = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashed,
        name: input.name,
      },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    });

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password.');
    }

    if (user.status === 'INACTIVE') {
      throw new AppError(403, 'Your account has been deactivated. Contact an administrator.');
    }

    const isValid = await bcrypt.compare(input.password, user.password);
    if (!isValid) {
      throw new AppError(401, 'Invalid email or password.');
    }

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);

    const { password: _pw, ...userSafe } = user;
    return { user: userSafe, ...tokens };
  }

  async refresh(token: string) {
    // Verify the token is cryptographically valid
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token.');
    }

    // Check it still exists in the DB (not revoked)
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(401, 'Refresh token has been revoked or expired.');
    }

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { token } });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status === 'INACTIVE') {
      throw new AppError(401, 'User not found or inactive.');
    }

    return this.generateTokenPair(user.id, user.email, user.role);
  }

  async logout(token: string) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async generateTokenPair(userId: string, email: string, role: string) {
    const payload: JwtPayload = { userId, email, role: role as JwtPayload['role'] };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    // Persist refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
