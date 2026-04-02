// src/modules/transactions/transactions.routes.ts

import { Router } from 'express';
import { catchAsync } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
} from './transactions.schema';
import * as txController from './transactions.controller';

const router = Router();

// All transaction routes require authentication
router.use(authenticate);

// Read — all roles
router.get('/',
  authorize('VIEWER', 'ANALYST', 'ADMIN'),
  validate(listTransactionsQuerySchema, 'query'),
  catchAsync(txController.list)
);

router.get('/:id',
  authorize('VIEWER', 'ANALYST', 'ADMIN'),
  catchAsync(txController.getById)
);

// Write — ADMIN only
router.post('/',
  authorize('ADMIN'),
  validate(createTransactionSchema),
  catchAsync(txController.create)
);

router.patch('/:id',
  authorize('ADMIN'),
  validate(updateTransactionSchema),
  catchAsync(txController.update)
);

router.delete('/:id',
  authorize('ADMIN'),
  catchAsync(txController.remove)
);

export default router;
