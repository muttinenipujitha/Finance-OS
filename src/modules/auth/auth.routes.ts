// src/modules/auth/auth.routes.ts

import { Router } from 'express';
import { catchAsync } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

router.post('/register', validate(registerSchema), catchAsync(authController.register));
router.post('/login',    validate(loginSchema),    catchAsync(authController.login));
router.post('/refresh',  validate(refreshSchema),  catchAsync(authController.refresh));
router.post('/logout',   validate(refreshSchema),  catchAsync(authController.logout));
router.get('/me',        authenticate,             catchAsync(authController.me));

export default router;
