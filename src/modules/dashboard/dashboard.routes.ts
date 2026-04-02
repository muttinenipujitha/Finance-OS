// src/modules/dashboard/dashboard.routes.ts

import { Router } from 'express';
import { catchAsync } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { trendsQuerySchema, summaryQuerySchema } from './dashboard.schema';
import * as dashboardController from './dashboard.controller';

const router = Router();

router.use(authenticate);

// All roles can view the summary and recent activity
router.get('/summary',
  authorize('VIEWER', 'ANALYST', 'ADMIN'),
  validate(summaryQuerySchema, 'query'),
  catchAsync(dashboardController.summary)
);

router.get('/recent',
  authorize('VIEWER', 'ANALYST', 'ADMIN'),
  catchAsync(dashboardController.recent)
);

// Analyst + Admin only for deeper analytics
router.get('/trends',
  authorize('ANALYST', 'ADMIN'),
  validate(trendsQuerySchema, 'query'),
  catchAsync(dashboardController.trends)
);

router.get('/categories',
  authorize('ANALYST', 'ADMIN'),
  catchAsync(dashboardController.categories)
);

export default router;
