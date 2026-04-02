// src/modules/transactions/transactions.schema.ts

import { z } from 'zod';
import { TransactionType } from '@prisma/client';

export const createTransactionSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be positive')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places'),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: 'Type must be INCOME or EXPENSE' }),
  }),
  category: z.string().min(1, 'Category is required').max(100),
  date: z.coerce.date({ required_error: 'Date is required' }),
  notes: z.string().max(500).optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const listTransactionsQuerySchema = z.object({
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
  type:      z.nativeEnum(TransactionType).optional(),
  category:  z.string().optional(),
  dateFrom:  z.coerce.date().optional(),
  dateTo:    z.coerce.date().optional(),
  search:    z.string().optional(),
  sortBy:    z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).refine(
  (data) => !data.dateFrom || !data.dateTo || data.dateFrom <= data.dateTo,
  { message: 'dateFrom must be before or equal to dateTo', path: ['dateFrom'] }
);

export type CreateTransactionInput  = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput  = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery   = z.infer<typeof listTransactionsQuerySchema>;
