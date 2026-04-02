// src/modules/auth/auth.controller.ts

import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import type { RegisterInput, LoginInput, RefreshInput } from './auth.schema';

const authService = new AuthService();

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body as RegisterInput);
  sendSuccess(res, result, 201);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body as LoginInput);
  sendSuccess(res, result);
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as RefreshInput;
  const tokens = await authService.refresh(refreshToken);
  sendSuccess(res, tokens);
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body as RefreshInput;
  await authService.logout(refreshToken);
  sendSuccess(res, { message: 'Logged out successfully.' });
}

export async function me(req: Request, res: Response) {
  sendSuccess(res, req.user);
}
