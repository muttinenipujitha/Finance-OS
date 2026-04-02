// src/modules/dashboard/dashboard.controller.ts

import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { sendSuccess } from '../../utils/response';
import type { TrendsQuery, SummaryQuery } from './dashboard.schema';

const dashboardService = new DashboardService();

export async function summary(req: Request, res: Response) {
  const data = await dashboardService.getSummary(req.query as unknown as SummaryQuery);
  sendSuccess(res, data);
}

export async function trends(req: Request, res: Response) {
  const data = await dashboardService.getTrends(req.query as unknown as TrendsQuery);
  sendSuccess(res, data);
}

export async function categories(req: Request, res: Response) {
  const data = await dashboardService.getCategoryTotals();
  sendSuccess(res, data);
}

export async function recent(req: Request, res: Response) {
  const limit = Math.min(50, parseInt(String(req.query.limit || '10'), 10) || 10);
  const data = await dashboardService.getRecentActivity(limit);
  sendSuccess(res, data);
}
