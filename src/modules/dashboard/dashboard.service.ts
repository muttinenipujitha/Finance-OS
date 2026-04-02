// src/modules/dashboard/dashboard.service.ts

import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../../config/database';
import type { TrendsQuery, SummaryQuery } from './dashboard.schema';

export class DashboardService {
  /**
   * Overall financial summary: total income, total expenses, net balance.
   * Optionally filtered by a date range.
   */
  async getSummary(query: SummaryQuery) {
    const where: Prisma.TransactionWhereInput = {
      deletedAt: null,
      ...((query.dateFrom || query.dateTo) && {
        date: {
          ...(query.dateFrom && { gte: query.dateFrom }),
          ...(query.dateTo   && { lte: query.dateTo }),
        },
      }),
    };

    const [incomeAgg, expenseAgg, transactionCount] = await prisma.$transaction([
      prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.INCOME },
        _sum:   { amount: true },
        _count: { id: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.EXPENSE },
        _sum:   { amount: true },
        _count: { id: true },
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalIncome  = Number(incomeAgg._sum.amount  ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);

    return {
      totalIncome,
      totalExpenses: totalExpense,
      netBalance:    totalIncome - totalExpense,
      incomeCount:   incomeAgg._count.id,
      expenseCount:  expenseAgg._count.id,
      totalTransactions: transactionCount,
    };
  }

  /**
   * Category-wise breakdown of income and expenses.
   */
  async getCategoryTotals() {
    const results = await prisma.transaction.groupBy({
      by: ['category', 'type'],
      where: { deletedAt: null },
      _sum:   { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    // Shape into { category, income, expense, net }
    const map = new Map<
      string,
      { category: string; income: number; expense: number; count: number }
    >();

    for (const row of results) {
      if (!map.has(row.category)) {
        map.set(row.category, { category: row.category, income: 0, expense: 0, count: 0 });
      }
      const entry = map.get(row.category)!;
      const amount = Number(row._sum.amount ?? 0);

      if (row.type === TransactionType.INCOME) {
        entry.income += amount;
      } else {
        entry.expense += amount;
      }
      entry.count += row._count.id;
    }

    return Array.from(map.values())
      .map((e) => ({ ...e, net: e.income - e.expense }))
      .sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  }

  /**
   * Monthly or weekly trend data for charting.
   * Returns an array of { period, income, expense, net } objects.
   */
  async getTrends(query: TrendsQuery) {
    const { period, months } = query;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    // Use raw SQL for date truncation — Prisma groupBy doesn't support date_trunc natively
    const truncUnit = period === 'monthly' ? 'month' : 'week';

    const rows = await prisma.$queryRaw<
      Array<{ period: Date; type: TransactionType; total: number }>
    >`
      SELECT
        DATE_TRUNC(${truncUnit}, date)::date AS period,
        type,
        SUM(amount)::float                  AS total
      FROM transactions
      WHERE deleted_at IS NULL
        AND date >= ${since}
      GROUP BY DATE_TRUNC(${truncUnit}, date), type
      ORDER BY period ASC
    `;

    // Merge income + expense rows into one entry per period
    const periodMap = new Map<
      string,
      { period: string; income: number; expense: number; net: number }
    >();

    for (const row of rows) {
      const key = row.period.toISOString().split('T')[0];
      if (!periodMap.has(key)) {
        periodMap.set(key, { period: key, income: 0, expense: 0, net: 0 });
      }
      const entry = periodMap.get(key)!;
      if (row.type === TransactionType.INCOME) {
        entry.income += Number(row.total);
      } else {
        entry.expense += Number(row.total);
      }
      entry.net = entry.income - entry.expense;
    }

    return Array.from(periodMap.values());
  }

  /**
   * Most recent N transactions (default 10).
   */
  async getRecentActivity(limit = 10) {
    return prisma.transaction.findMany({
      where:   { deletedAt: null },
      orderBy: { date: 'desc' },
      take:    limit,
      include: { user: { select: { id: true, name: true } } },
    });
  }
}
