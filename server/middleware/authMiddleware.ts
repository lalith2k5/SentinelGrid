import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.ts';
import { UserRole } from '../db/schema.ts';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
  }

  const token = authHeader.substring(7).trim();
  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }

  req.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    name: payload.name
  };

  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Requires one of roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}
