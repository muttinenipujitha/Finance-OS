// src/modules/users/users.controller.ts

import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { sendSuccess } from '../../utils/response';
import type { UpdateRoleInput, UpdateStatusInput, ListUsersQuery } from './users.schema';

const usersService = new UsersService();

export async function list(req: Request, res: Response) {
  const result = await usersService.list(req.query as unknown as ListUsersQuery);
  sendSuccess(res, result.users, 200, result.meta);
}

export async function getById(req: Request, res: Response) {
  const user = await usersService.findById(req.params.id);
  sendSuccess(res, user);
}

export async function updateRole(req: Request, res: Response) {
  const user = await usersService.updateRole(
    req.params.id,
    req.body as UpdateRoleInput,
    req.user.userId
  );
  sendSuccess(res, user);
}

export async function updateStatus(req: Request, res: Response) {
  const user = await usersService.updateStatus(
    req.params.id,
    req.body as UpdateStatusInput,
    req.user.userId
  );
  sendSuccess(res, user);
}

export async function remove(req: Request, res: Response) {
  const user = await usersService.softDelete(req.params.id, req.user.userId);
  sendSuccess(res, user);
}
