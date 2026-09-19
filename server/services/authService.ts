import crypto from 'crypto';
import { db } from '../db/database.ts';
import { User, UserRole } from '../db/schema.ts';

const TOKEN_SECRET = process.env.AUTH_SECRET || 'sentinelgrid-local-offline-secret-key-32chars!';

interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  exp: number;
}

export class AuthService {
  /**
   * Secure password hashing using Node.js built-in scrypt
   */
  public hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  }

  public verifyPassword(password: string, hash: string, salt: string): boolean {
    const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
  }

  /**
   * Lightweight HMAC-SHA256 signed token for local/offline sessions
   */
  public generateToken(user: User): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  public verifyToken(token: string): AuthTokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;
      const [encodedPayload, signature] = parts;
      const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(encodedPayload).digest('base64url');
      if (signature !== expectedSignature) return null;

      const payload: AuthTokenPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
      if (payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  public register(params: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    badgeNumber?: string;
    department?: string;
  }): { user: Omit<User, 'passwordHash' | 'salt'>; token: string } {
    const normalizedEmail = params.email.trim().toLowerCase();

    const existing = db.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    if (params.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const { hash, salt } = this.hashPassword(params.password);
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newUser: User = {
      id,
      email: normalizedEmail,
      passwordHash: hash,
      salt,
      name: params.name.trim(),
      role: params.role,
      badgeNumber: params.badgeNumber?.trim(),
      department: params.department?.trim(),
      createdAt: now,
      updatedAt: now
    };

    db.insertUser(newUser);

    db.logAudit({
      actorId: id,
      actorEmail: normalizedEmail,
      actorRole: params.role,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: id,
      details: `New ${params.role} account created for ${params.name}`
    });

    const token = this.generateToken(newUser);
    const { passwordHash: _, salt: __, ...sanitizedUser } = newUser;
    return { user: sanitizedUser, token };
  }

  public login(params: {
    email: string;
    password: string;
  }): { user: Omit<User, 'passwordHash' | 'salt'>; token: string } {
    const normalizedEmail = params.email.trim().toLowerCase();
    const user = db.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isValid = this.verifyPassword(params.password, user.passwordHash, user.salt);
    if (!isValid) {
      throw new Error('Invalid email or password.');
    }

    db.logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: `User logged in successfully with role ${user.role}`
    });

    const token = this.generateToken(user);
    const { passwordHash: _, salt: __, ...sanitizedUser } = user;
    return { user: sanitizedUser, token };
  }
}

export const authService = new AuthService();
