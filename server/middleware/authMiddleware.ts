import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.ts';
import { db } from '../db/database.ts';
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
      token?: string;
    }
  }
}

/**
 * Authentication Middleware:
 * 1. Validates token signature, expiration, and revocation.
 * 2. Identifies the user from payload.userId.
 * 3. Loads the CURRENT user record from the local database.
 * 4. Uses the database role as the authoritative role (does NOT trust token's stale role).
 * 5. If user no longer exists, rejects the session (401).
 * 6. If user account is disabled, rejects the session (401 / 403).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Empty token provided.' });
  }

  // 1. Verify token cryptographic signature, expiry, and revocation
  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired, revoked, or invalid token. Please log in again.' });
  }

  // 2. Identify the user and load CURRENT user record from local database
  const currentUser = db.findUserById(payload.userId);
  if (!currentUser) {
    return res.status(401).json({ error: 'User account no longer exists. Session rejected.' });
  }

  // 3. Reject session if account is marked disabled
  if (currentUser.disabled) {
    return res.status(403).json({ error: 'User account has been disabled. Access denied.' });
  }

  // 4. Use CURRENT database role as the authoritative role (do NOT trust payload.role)
  req.token = token;
  req.user = {
    userId: currentUser.id,
    email: currentUser.email,
    role: currentUser.role, // Authoritative DB role
    name: currentUser.name
  };

  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Requires one of roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}
