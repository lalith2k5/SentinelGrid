import { Router, Request, Response } from 'express';
import { authService } from '../services/authService.ts';
import { requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { db } from '../db/database.ts';
import { UserRole } from '../db/schema.ts';

const router = Router();

// Get registration status (First user ADMIN, subsequent OPERATOR)
router.get('/registration-status', (_req: Request, res: Response) => {
  try {
    const status = authService.getRegistrationStatus();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to check registration status' });
  }
});

// Register new user
router.post('/register', (req: Request, res: Response) => {
  try {
    const { email, password, name, role, badgeNumber, department } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long.' });
    }

    const result = authService.register({
      email,
      password,
      name,
      role,
      badgeNumber,
      department
    });

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

// Login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = authService.login({ email, password });
    return res.json(result);
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Authentication failed.' });
  }
});

// Get current session user
router.get('/me', requireAuth, (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = db.findUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found in local database' });
  }

  const { passwordHash: _, salt: __, ...sanitizedUser } = user;
  return res.json({ user: sanitizedUser });
});

// Logout & invalidate session token
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  if (req.token) {
    authService.revokeToken(req.token);
  }

  if (req.user) {
    db.logAudit({
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: req.user.userId,
      details: 'User logged out and session token was revoked'
    });
  }

  return res.json({ success: true, message: 'Session invalidated successfully' });
});

// Admin-only: list all users
router.get('/users', requireAuth, requireRole('ADMIN'), (_req: Request, res: Response) => {
  const users = db.getUsers().map(u => {
    const { passwordHash: _, salt: __, ...sanitized } = u;
    return sanitized;
  });
  return res.json({ users });
});

// Admin-only: update user role
router.patch('/users/:id/role', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  const validRoles: UserRole[] = ['ADMIN', 'DISPATCHER', 'RESPONDER', 'OPERATOR'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
  }

  const updatedUser = db.updateUserRole(id, role);
  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.logAudit({
    actorId: req.user!.userId,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'USER_ROLE_UPDATED',
    entityType: 'User',
    entityId: id,
    details: `Updated role for ${updatedUser.name} (${updatedUser.email}) to ${role}`
  });

  const { passwordHash: _, salt: __, ...sanitized } = updatedUser;
  return res.json({ user: sanitized });
});

export default router;

