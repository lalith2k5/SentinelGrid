import { Router, Request, Response } from 'express';
import { authService } from '../services/authService.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';
import { db } from '../db/database.ts';

const router = Router();

// Register new user
router.post('/register', (req: Request, res: Response) => {
  try {
    const { email, password, name, role, badgeNumber, department } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, and role are required.' });
    }

    const validRoles = ['ADMIN', 'DISPATCHER', 'RESPONDER', 'OPERATOR'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
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

// Logout audit
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  if (req.user) {
    db.logAudit({
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: req.user.userId,
      details: 'User logged out of SentinelGrid local session'
    });
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
