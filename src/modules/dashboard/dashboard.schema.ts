// src/modules/dashboard/dashboard.schema.ts

import { z } from 'zod';

export const trendsQuerySchema = z.object({
  period:  z.enum(['monthly', 'weekly']).default('monthly'),
  months:  z.coerce.number().int().min(1).max(24).default(12),
});

export const summaryQuerySchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo:   z.coerce.date().optional(),
});

export type TrendsQuery  = z.infer<typeof trendsQuerySchema>;
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
