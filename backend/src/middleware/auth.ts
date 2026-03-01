import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface TokenPayload {
  sub: string;
  role: 'therapist' | 'patient';
  mfaVerified?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticateToken(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
    req.user = payload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient role');
    }
    next();
  };
}

export function requireMFA(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.mfaVerified) {
    throw new ForbiddenError('MFA verification required', 'MFA_REQUIRED');
  }
  next();
}
