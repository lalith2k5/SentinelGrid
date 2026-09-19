import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '../db/database.ts';
import { User, UserRole } from '../db/schema.ts';

/**
 * Retrieve or generate a cryptographically secure 32-byte auth secret.
 * Stored locally at data/.auth_secret with restricted permissions (0600)
 * when process.env.AUTH_SECRET is not provided.
 */
function getOrCreateAuthSecret(): string {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim().length >= 16) {
    return process.env.AUTH_SECRET.trim();
  }

  const secretFilePath = path.join(process.cwd(), 'data', '.auth_secret');
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(secretFilePath)) {
      const secret = fs.readFileSync(secretFilePath, 'utf-8').trim();
      if (secret.length >= 32) {
        return secret;
      }
    }

    const generatedSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFilePath, generatedSecret, { mode: 0o600, encoding: 'utf-8' });
    return generatedSecret;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

const TOKEN_SECRET = getOrCreateAuthSecret();

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
      if (db.isTokenRevoked(token)) {
        return null;
      }

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

  public revokeToken(token: string): void {
    db.revokeToken(token);
  }

  /**
   * Check system registration state:
   * First registered user becomes ADMIN. Subsequent users are OPERATOR.
   */
  public getRegistrationStatus(): { hasAdmin: boolean; nextRole: UserRole } {
    const users = db.getUsers();
    const hasAdmin = users.some(u => u.role === 'ADMIN');
    return {
      hasAdmin,
      nextRole: hasAdmin ? 'OPERATOR' : 'ADMIN'
    };
  }

  public register(params: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    badgeNumber?: string;
    department?: string;
  }): { user: Omit<User, 'passwordHash' | 'salt'>; token: string } {
    const normalizedEmail = params.email.trim().toLowerCase();

    // Strict email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('Invalid email address format.');
    }

    const existing = db.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    if (params.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const trimmedName = params.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      throw new Error('Name must be between 2 and 100 characters long.');
    }

    // Role assignment rules:
    // First user in the database becomes ADMIN.
    // Subsequent users are strictly OPERATOR (preventing privilege escalation on public registration).
    const users = db.getUsers();
    const hasAdmin = users.some(u => u.role === 'ADMIN');
    const assignedRole: UserRole = hasAdmin ? 'OPERATOR' : 'ADMIN';

    const { hash, salt } = this.hashPassword(params.password);
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newUser: User = {
      id,
      email: normalizedEmail,
      passwordHash: hash,
      salt,
      name: trimmedName,
      role: assignedRole,
      badgeNumber: params.badgeNumber?.trim() || undefined,
      department: params.department?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    db.insertUser(newUser);

    db.logAudit({
      actorId: id,
      actorEmail: normalizedEmail,
      actorRole: assignedRole,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: id,
      details: hasAdmin
        ? `Standard OPERATOR registration for ${trimmedName} (Role restricted by system)`
        : `Initial PRIMARY ADMIN account created for ${trimmedName}`
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

  public getAuthSecret(): string {
    return TOKEN_SECRET;
  }

  public isTokenRevoked(token: string): boolean {
    return db.isTokenRevoked(token);
  }
}

export const authService = new AuthService();

