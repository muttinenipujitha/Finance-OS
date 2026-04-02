// src/middleware/authorize.ts

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';


/**
 * Role guard factory. Usage:
 *   router.post('/', authenticate, authorize('ADMIN'), createHandler)
 *   router.get('/',  authenticate, authorize('VIEWER', 'ANALYST', 'ADMIN'), listHandler)
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated.');
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        403,
        `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
      );
    }

    next();
  };
}
