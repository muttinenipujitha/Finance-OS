// src/modules/transactions/transactions.service.ts

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta } from '../../utils/response';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  ListTransactionsQuery,
} from './transactions.schema';

export class TransactionsService {
  async list(query: ListTransactionsQuery) {
    const { page, limit, type, category, dateFrom, dateTo, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      deletedAt: null,
      ...(type     && { type }),
      ...(category && { category: { contains: category, mode: 'insensitive' } }),
      ...(search   && { notes: { contains: search, mode: 'insensitive' } }),
      ...((dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo   && { lte: dateTo }),
        },
      }),
    };

    const orderBy: Prisma.TransactionOrderByWithRelationInput = { [sortBy]: sortOrder };

    const [transactions, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions, meta: buildPaginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    const tx = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!tx) throw new AppError(404, 'Transaction not found.');
    return tx;
  }

  async create(input: CreateTransactionInput, userId: string) {
    return prisma.transaction.create({
      data: {
        ...input,
        userId,
        amount: new Prisma.Decimal(input.amount),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async update(id: string, input: UpdateTransactionInput) {
    await this.findById(id);
    return prisma.transaction.update({
      where: { id },
      data: {
        ...input,
        ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async softDelete(id: string) {
    await this.findById(id);
    return prisma.transaction.update({
      where: { id },
      data:  { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
