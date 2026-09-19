import fs from 'fs';
import path from 'path';
import { DatabaseSchema, User, Incident, Resource, AuditLog, IncidentLocation } from './schema.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sentinelgrid.json');

const INITIAL_SCHEMA: DatabaseSchema = {
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
  auditLogs: []
};

class LocalDatabase {
  private data: DatabaseSchema;
  private isInitialized = false;

  constructor() {
    this.data = { ...INITIAL_SCHEMA };
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all arrays exist in case of schema additions
        this.data.users = this.data.users || [];
        this.data.incidents = this.data.incidents || [];
        this.data.incidentLocations = this.data.incidentLocations || [];
        this.data.resources = this.data.resources || [];
        this.data.responders = this.data.responders || [];
        this.data.messages = this.data.messages || [];
        this.data.meshNodes = this.data.meshNodes || [];
        this.data.knowledgeDocuments = this.data.knowledgeDocuments || [];
        this.data.auditLogs = this.data.auditLogs || [];
      } else {
        this.saveSync();
      }
      this.isInitialized = true;
      console.log(`[SentinelGrid DB] Local persistence ready at: ${DB_FILE}`);
    } catch (err) {
      console.error('[SentinelGrid DB] Initialization error:', err);
      // Fallback in-memory
      this.isInitialized = true;
    }
  }

  private saveSync(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[SentinelGrid DB] Save error:', err);
    }
  }

  public getStatus() {
    return {
      connected: this.isInitialized,
      type: 'Local File JSON Engine (Zero Cloud / Offline)',
      filePath: DB_FILE,
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
