// src/modules/users/users.routes.ts

import { Router } from 'express';
import { catchAsync } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { updateRoleSchema, updateStatusSchema, listUsersQuerySchema } from './users.schema';
import * as usersController from './users.controller';

const router = Router();

// All users routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

router.get('/',
  validate(listUsersQuerySchema, 'query'),
  catchAsync(usersController.list)
);

router.get('/:id',
  catchAsync(usersController.getById)
);

router.patch('/:id/role',
  validate(updateRoleSchema),
  catchAsync(usersController.updateRole)
);

router.patch('/:id/status',
  validate(updateStatusSchema),
  catchAsync(usersController.updateStatus)
);

router.delete('/:id',
  catchAsync(usersController.remove)
);

export default router;
