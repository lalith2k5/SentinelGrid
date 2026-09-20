import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseSchema, User, UserRole, Incident, Resource, AuditLog, IncidentLocation } from './schema.ts';

/**
 * Hash bearer tokens with SHA-256 for secure revoked token persistence.
 * Raw bearer tokens are never persisted in the database.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sentinelgrid.json');

function createInitialSchema(): DatabaseSchema {
  return {
    version: 1,
    initializedAt: new Date().toISOString(),
    users: [],
    incidents: [],
    incidentLocations: [],
    resources: [],
    responders: [],
    messages: [],
    meshNodes: [],
    knowledgeDocuments: [],
    auditLogs: [],
    lastIncidentSequence: {},
    revokedTokens: []
  };
}

class LocalDatabase {
  private data: DatabaseSchema;
  private isInitialized = false;
  private dbFilePath = DB_FILE;

  constructor() {
    this.data = createInitialSchema();
  }

  public resetForTesting(customFilePath?: string): void {
    this.dbFilePath = customFilePath || DB_FILE;
    this.isInitialized = false;
    this.initSync();
  }

  public initSync(): void {
    if (this.isInitialized) return;

    try {
      const dataDir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dbFilePath)) {
        try {
          const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
          this.data = JSON.parse(raw);
          // Ensure all arrays and dictionaries exist in case of schema additions
          this.data.users = this.data.users || [];
          this.data.incidents = this.data.incidents || [];
          this.data.incidentLocations = this.data.incidentLocations || [];
          this.data.resources = this.data.resources || [];
          this.data.responders = this.data.responders || [];
          this.data.messages = this.data.messages || [];
          this.data.meshNodes = this.data.meshNodes || [];
          this.data.knowledgeDocuments = this.data.knowledgeDocuments || [];
          this.data.auditLogs = this.data.auditLogs || [];
          this.data.lastIncidentSequence = this.data.lastIncidentSequence || {};
          this.data.revokedTokens = this.data.revokedTokens || [];
        } catch (parseErr) {
          console.warn('[SentinelGrid DB] Corrupted database JSON file detected. Creating backup and re-initializing clean database...', parseErr);
          try {
            const backupFile = path.join(dataDir, `sentinelgrid.corrupt.${Date.now()}.json`);
            fs.copyFileSync(this.dbFilePath, backupFile);
            console.log(`[SentinelGrid DB] Corrupted database backed up to: ${backupFile}`);
          } catch (backupErr) {
            console.error('[SentinelGrid DB] Failed to create backup of corrupt file:', backupErr);
          }
          this.data = createInitialSchema();
          this.saveSync();
        }
      } else {
        this.saveSync();
      }
      this.isInitialized = true;
      console.log(`[SentinelGrid DB] Local persistence ready at: ${this.dbFilePath}`);
    } catch (err) {
      console.error('[SentinelGrid DB] Initialization error:', err);
      // Fallback in-memory
      this.isInitialized = true;
    }
  }

  public async init(): Promise<void> {
    this.initSync();
  }

  private saveSync(): void {
    try {
      const dataDir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const tmpFile = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, this.dbFilePath);
    } catch (err) {
      console.error('[SentinelGrid DB] Save error:', err);
    }
  }

  public getStatus() {
    return {
      connected: this.isInitialized,
      isInitialized: this.isInitialized,
      type: 'Local File JSON Engine (Zero Cloud / Offline)',
      filePath: this.dbFilePath,
      counts: {
        users: this.data.users.length,
        incidents: this.data.incidents.length,
        resources: this.data.resources.length,
        responders: this.data.responders.length,
        meshNodes: this.data.meshNodes.length,
        knowledgeDocuments: this.data.knowledgeDocuments.length,
        auditLogs: this.data.auditLogs.length
      }
    };
  }

  // Users
  public getUsers(): User[] {
    return [...this.data.users];
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public insertUser(user: User): User {
    this.data.users.push(user);
    this.saveSync();
    return user;
  }

  // Incidents
  public getIncidents(): Incident[] {
    return [...this.data.incidents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public findIncidentById(id: string): Incident | undefined {
    return this.data.incidents.find(i => i.id === id);
  }

  public insertIncident(incident: Incident, location?: IncidentLocation): Incident {
    if (location) {
      this.data.incidentLocations.push(location);
    }
    this.data.incidents.push(incident);
    this.saveSync();
    return incident;
  }

  public updateIncident(id: string, updates: Partial<Incident>): Incident | undefined {
    const idx = this.data.incidents.findIndex(i => i.id === id);
    if (idx === -1) return undefined;
    this.data.incidents[idx] = {
      ...this.data.incidents[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveSync();
    return this.data.incidents[idx];
  }

  public deleteIncident(id: string): boolean {
    const idx = this.data.incidents.findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.data.incidents.splice(idx, 1);
    this.saveSync();
    return true;
  }

  public clearDemoIncidents(): void {
    this.data.incidents = this.data.incidents.filter(i => !i.isDemoData);
    this.saveSync();
  }

  // Resources
  public getResources(): Resource[] {
    return [...this.data.resources].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public insertResource(resource: Resource): Resource {
    this.data.resources.push(resource);
    this.saveSync();
    return resource;
  }

  public updateResource(id: string, updates: Partial<Resource>): Resource | undefined {
    const idx = this.data.resources.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.data.resources[idx] = {
      ...this.data.resources[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveSync();
    return this.data.resources[idx];
  }

  public clearDemoResources(): void {
    this.data.resources = this.data.resources.filter(r => !r.isDemoData);
    this.saveSync();
  }

  // Incident sequence tracking (concurrency & deletion safe)
  public getNextIncidentSequence(year: number): number {
    const yearStr = String(year);
    this.data.lastIncidentSequence = this.data.lastIncidentSequence || {};

    let highestInDb = 0;
    const regex = new RegExp(`^INC-${yearStr}-(\\d+)$`);
    for (const inc of this.data.incidents) {
      const match = inc.incidentNumber.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > highestInDb) {
          highestInDb = num;
        }
      }
    }

    const lastRecorded = this.data.lastIncidentSequence[yearStr] || 0;
    const nextSeq = Math.max(highestInDb, lastRecorded) + 1;
    this.data.lastIncidentSequence[yearStr] = nextSeq;
    this.saveSync();
    return nextSeq;
  }

  // Token Revocation (Cryptographic SHA-256 Hash Storage)
  public revokeToken(token: string): void {
    if (!token || typeof token !== 'string') return;
    this.data.revokedTokens = this.data.revokedTokens || [];
    // Always store SHA-256 hash of the bearer token, NEVER the raw token
    const tokenHash = hashToken(token);
    if (!this.data.revokedTokens.includes(tokenHash)) {
      this.data.revokedTokens.push(tokenHash);
      if (this.data.revokedTokens.length > 5000) {
        this.data.revokedTokens = this.data.revokedTokens.slice(-5000);
      }
      this.saveSync();
    }
  }

  public isTokenRevoked(token: string): boolean {
    if (!token || typeof token !== 'string') return true;
    this.data.revokedTokens = this.data.revokedTokens || [];
    const tokenHash = hashToken(token);
    return this.data.revokedTokens.includes(tokenHash) || this.data.revokedTokens.includes(token);
  }

  public getRevokedTokens(): string[] {
    return [...(this.data.revokedTokens || [])];
  }

  // User Role Management with Last-Admin Protection
  public updateUserRole(userId: string, role: UserRole): User {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Enforce last administrator protection
    if (user.role === 'ADMIN' && role !== 'ADMIN') {
      const activeAdmins = this.data.users.filter(u => u.role === 'ADMIN' && !u.disabled && u.id !== userId);
      if (activeAdmins.length === 0) {
        throw new Error('At least one administrator account must remain.');
      }
    }

    user.role = role;
    user.updatedAt = new Date().toISOString();
    this.saveSync();
    return user;
  }

  // Delete user with Last-Admin Protection
  public deleteUser(userId: string): boolean {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return false;

    if (user.role === 'ADMIN') {
      const activeAdmins = this.data.users.filter(u => u.role === 'ADMIN' && !u.disabled && u.id !== userId);
      if (activeAdmins.length === 0) {
        throw new Error('At least one administrator account must remain.');
      }
    }

    this.data.users = this.data.users.filter(u => u.id !== userId);
    this.saveSync();
    return true;
  }

  // Disable/enable user with Last-Admin Protection
  public setUserDisabled(userId: string, disabled: boolean): User {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'ADMIN' && disabled) {
      const activeAdmins = this.data.users.filter(u => u.role === 'ADMIN' && !u.disabled && u.id !== userId);
      if (activeAdmins.length === 0) {
        throw new Error('At least one administrator account must remain.');
      }
    }

    user.disabled = disabled;
    user.updatedAt = new Date().toISOString();
    this.saveSync();
    return user;
  }

  // Audit Logs
  public logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(newLog);
    // Keep max 1000 logs in local storage
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.saveSync();
    return newLog;
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.data.auditLogs];
  }
}

export const db = new LocalDatabase();
