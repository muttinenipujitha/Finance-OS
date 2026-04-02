// src/modules/transactions/transactions.controller.ts

import { Request, Response } from 'express';
import { TransactionsService } from './transactions.service';
import { sendSuccess } from '../../utils/response';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
} from './transactions.schema';

const transactionsService = new TransactionsService();

export async function list(req: Request, res: Response) {
  const result = await transactionsService.list(req.query as unknown as ListTransactionsQuery);
  sendSuccess(res, result.transactions, 200, result.meta);
}

export async function getById(req: Request, res: Response) {
  const tx = await transactionsService.findById(req.params.id);
  sendSuccess(res, tx);
}

export async function create(req: Request, res: Response) {
  const tx = await transactionsService.create(
    req.body as CreateTransactionInput,
    req.user.userId
  );
  sendSuccess(res, tx, 201);
}

export async function update(req: Request, res: Response) {
  const tx = await transactionsService.update(
    req.params.id,
    req.body as UpdateTransactionInput
  );
  sendSuccess(res, tx);
}

export async function remove(req: Request, res: Response) {
  const result = await transactionsService.softDelete(req.params.id);
  sendSuccess(res, result);
}
