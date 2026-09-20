import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DatabaseSchema,
  User,
  UserRole,
  Incident,
  Resource,
  ResourceStatus,
  ResourceAvailability,
  AuditLog,
  IncidentLocation,
  SimulatedMeshNode,
  SimulatedMeshPacket,
  SimulatedMeshEvent,
  MeshSimulationConfig,
  AIIncidentTriageRecord,
  Dispatch,
  Responder,
  KnowledgeDocument
} from './schema.ts';
import { Hazard, BlockedRoad, RouteResult } from '../gis/types.ts';
import { DEFAULT_KNOWLEDGE_CORPUS } from '../knowledge/defaultCorpus.ts';

/**
 * Hash bearer tokens with SHA-256 for secure revoked token persistence.
 * Raw bearer tokens are never persisted in the database.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sentinelgrid.json');

export function createDefaultSimulatedNodes(): SimulatedMeshNode[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'COMMAND-01',
      nodeId: 'COMMAND-01',
      nodeName: 'Command Post Central',
      nodeType: 'COMMAND',
      status: 'ONLINE',
      latitude: 28.6139,
      longitude: 77.2090,
      batteryLevel: 100,
      signalQuality: 98,
      lastSeen: now,
      neighbors: ['RELAY-01', 'RELAY-02'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'RELAY-01',
      nodeId: 'RELAY-01',
      nodeName: 'Ridge Repeater 01',
      nodeType: 'RELAY',
      status: 'ONLINE',
      latitude: 28.6250,
      longitude: 77.2180,
      batteryLevel: 94,
      signalQuality: 88,
      lastSeen: now,
      neighbors: ['COMMAND-01', 'RELAY-02', 'FIELD-01'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'RELAY-02',
      nodeId: 'RELAY-02',
      nodeName: 'Valley Repeater 02',
      nodeType: 'RELAY',
      status: 'ONLINE',
      latitude: 28.6020,
      longitude: 77.2250,
      batteryLevel: 89,
      signalQuality: 82,
      lastSeen: now,
      neighbors: ['COMMAND-01', 'RELAY-01', 'FIELD-02', 'RESPONDER-01'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'FIELD-01',
      nodeId: 'FIELD-01',
      nodeName: 'Field Outpost Alpha',
      nodeType: 'FIELD',
      status: 'ONLINE',
      latitude: 28.6380,
      longitude: 77.2310,
      batteryLevel: 78,
      signalQuality: 75,
      lastSeen: now,
      neighbors: ['RELAY-01'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'FIELD-02',
      nodeId: 'FIELD-02',
      nodeName: 'Community Beacon Beta',
      nodeType: 'FIELD',
      status: 'ONLINE',
      latitude: 28.5910,
      longitude: 77.2400,
      batteryLevel: 82,
      signalQuality: 70,
      lastSeen: now,
      neighbors: ['RELAY-02', 'RESPONDER-01'],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'RESPONDER-01',
      nodeId: 'RESPONDER-01',
      nodeName: 'Rescue Unit Mobile 4',
      nodeType: 'RESPONDER',
      status: 'ONLINE',
      latitude: 28.5990,
      longitude: 77.2310,
      batteryLevel: 68,
      signalQuality: 84,
      lastSeen: now,
      neighbors: ['RELAY-02', 'FIELD-02'],
      createdAt: now,
      updatedAt: now
    }
  ];
}

export function createDefaultMeshConfig(): MeshSimulationConfig {
  return {
    packetLossRate: 0.05,
    ackPacketLossRate: 0.0,
    minimumLatencyMs: 80,
    maximumLatencyMs: 240,
    initialTtl: 7,
    maxHops: 15,
    autoAck: true,
    deterministicMode: false
  };
}

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
    simulatedNodes: createDefaultSimulatedNodes(),
    meshPackets: [],
    meshEvents: [],
    meshConfig: createDefaultMeshConfig(),
    knowledgeDocuments: [...DEFAULT_KNOWLEDGE_CORPUS],
    auditLogs: [],
    aiTriageRecords: [],
    lastIncidentSequence: {},
    revokedTokens: [],
    hazards: [],
    blockedRoads: [],
    routeHistory: [],
    dispatches: []
  };
}

class LocalDatabase {
  private data: DatabaseSchema;
  private isInitialized = false;
  private status: 'OPERATIONAL' | 'DATABASE_UNAVAILABLE' = 'DATABASE_UNAVAILABLE';
  private initError: string | null = null;
  private dbFilePath = DB_FILE;

  constructor() {
    this.data = createInitialSchema();
  }

  public resetForTesting(customFilePath?: string): void {
    this.dbFilePath = customFilePath || DB_FILE;
    this.isInitialized = false;
    this.status = 'DATABASE_UNAVAILABLE';
    this.initError = null;
    this.initSync();
  }

  public simulateDatabaseFailure(errorMessage = 'Simulated database persistence failure'): void {
    this.isInitialized = false;
    this.status = 'DATABASE_UNAVAILABLE';
    this.initError = errorMessage;
  }

  public assertOperational(): void {
    if (!this.isInitialized || this.status === 'DATABASE_UNAVAILABLE') {
      throw new Error(`DATABASE_UNAVAILABLE: Database persistence is currently unavailable${this.initError ? ` (${this.initError})` : ''}`);
    }
  }

  public initSync(): void {
    if (this.isInitialized && this.status === 'OPERATIONAL') return;

    try {
      this.initError = null;
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
          if (!this.data.simulatedNodes || this.data.simulatedNodes.length === 0) {
            this.data.simulatedNodes = createDefaultSimulatedNodes();
          }
          this.data.meshPackets = this.data.meshPackets || [];
          this.data.meshEvents = this.data.meshEvents || [];
          this.data.meshConfig = this.data.meshConfig || createDefaultMeshConfig();
          if (!this.data.knowledgeDocuments || this.data.knowledgeDocuments.length === 0) {
            this.data.knowledgeDocuments = [...DEFAULT_KNOWLEDGE_CORPUS];
          }
          this.data.auditLogs = this.data.auditLogs || [];
          this.data.aiTriageRecords = this.data.aiTriageRecords || [];
          this.data.lastIncidentSequence = this.data.lastIncidentSequence || {};
          this.data.revokedTokens = this.data.revokedTokens || [];
          this.data.hazards = this.data.hazards || [];
          this.data.blockedRoads = this.data.blockedRoads || [];
          this.data.routeHistory = this.data.routeHistory || [];
          this.data.dispatches = this.data.dispatches || [];
        } catch (parseErr) {
          console.warn('[SentinelGrid DB] Corrupted database JSON file detected. Creating backup and re-initializing clean database...', parseErr);
          try {
            const baseName = path.basename(this.dbFilePath, '.json');
            const backupFile = path.join(dataDir, `${baseName}.corrupt.${Date.now()}.json`);
            fs.copyFileSync(this.dbFilePath, backupFile);
            console.log(`[SentinelGrid DB] Corrupted database backed up to: ${backupFile}`);

            // Bound corrupt backups to at most 3 to avoid unbounded disk accumulation
            const existingBackups = fs.readdirSync(dataDir)
              .filter(f => f.startsWith(`${baseName}.corrupt.`) && f.endsWith('.json'))
              .sort()
              .reverse();
            if (existingBackups.length > 3) {
              for (const oldBackup of existingBackups.slice(3)) {
                try { fs.unlinkSync(path.join(dataDir, oldBackup)); } catch {}
              }
            }
          } catch (backupErr) {
            console.error('[SentinelGrid DB] Failed to create backup of corrupt file:', backupErr);
          }
          this.data = createInitialSchema();
          this.saveSync(true);
        }
      } else {
        this.saveSync(true);
      }
      this.isInitialized = true;
      this.status = 'OPERATIONAL';
      console.log(`[SentinelGrid DB] Local persistence ready at: ${this.dbFilePath}`);
    } catch (err: any) {
      console.error('[SentinelGrid DB] Initialization error:', err);
      // Explicitly enter database-unavailable / degraded state: NO silent in-memory fallback
      this.isInitialized = false;
      this.status = 'DATABASE_UNAVAILABLE';
      this.initError = err?.message || 'Database initialization failed';
    }
  }

  public async init(): Promise<void> {
    this.initSync();
  }

  private saveSync(isInitializing = false): void {
    if (!isInitializing) {
      this.assertOperational();
    }
    try {
      const dataDir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const tmpFile = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, this.dbFilePath);
    } catch (err: any) {
      console.error('[SentinelGrid DB] Save error:', err);
      this.status = 'DATABASE_UNAVAILABLE';
      this.isInitialized = false;
      this.initError = err?.message || 'Database persistence save failure';
      throw new Error(`DATABASE_UNAVAILABLE: Failed to persist database write: ${err?.message || 'Unknown save error'}`);
    }
  }

  public getStatus() {
    return {
      connected: this.isInitialized && this.status === 'OPERATIONAL',
      isInitialized: this.isInitialized,
      status: this.status,
      error: this.initError,
      type: 'Local File JSON Engine (Zero Cloud / Offline)',
      filePath: this.dbFilePath,
      counts: {
        users: this.data?.users ? this.data.users.length : 0,
        incidents: this.data?.incidents ? this.data.incidents.length : 0,
        resources: this.data?.resources ? this.data.resources.length : 0,
        responders: this.data?.responders ? this.data.responders.length : 0,
        meshNodes: this.data?.meshNodes ? this.data.meshNodes.length : 0,
        knowledgeDocuments: this.data?.knowledgeDocuments ? this.data.knowledgeDocuments.length : 0,
        auditLogs: this.data?.auditLogs ? this.data.auditLogs.length : 0
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
    this.assertOperational();
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
    this.assertOperational();
    if (location) {
      this.data.incidentLocations.push(location);
    }
    this.data.incidents.push(incident);
    this.saveSync();
    return incident;
  }

  public updateIncident(id: string, updates: Partial<Incident>): Incident | undefined {
    this.assertOperational();
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
    this.assertOperational();
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
  private normalizeResource(r: Resource): Resource {
    const status: ResourceStatus = r.status || (
      r.availability === 'DEPLOYED' ? 'ASSIGNED' :
      r.availability === 'MAINTENANCE' || r.availability === 'OFFLINE' ? 'UNAVAILABLE' :
      (r.availability as ResourceStatus) || 'AVAILABLE'
    );
    const availability: ResourceAvailability = r.availability || status;
    
    let capabilities = r.capabilities;
    if (!capabilities || capabilities.length === 0) {
      if (r.type === 'AMBULANCE' || r.type === 'MEDICAL_TEAM') capabilities = ['MEDICAL'];
      else if (r.type === 'FIRE_UNIT') capabilities = ['FIRE'];
      else if (r.type === 'RESCUE_TEAM') capabilities = ['RESCUE'];
      else if (r.type === 'HAZMAT_UNIT') capabilities = ['HAZMAT'];
      else if (r.type === 'SEARCH_TEAM') capabilities = ['SEARCH'];
      else if (r.type === 'EVACUATION_UNIT') capabilities = ['EVACUATION'];
      else if (r.type === 'SHELTER') capabilities = ['SHELTER'];
      else if (r.type === 'SUPPLY_UNIT') capabilities = ['SUPPLIES'];
      else capabilities = ['OTHER'];
    }

    const currentIncidentId = r.currentIncidentId ?? r.assignedIncidentId ?? null;

    // Structured capacity defaults/parsing
    let patientCapacity = r.patientCapacity ?? null;
    let criticalCareCapacity = r.criticalCareCapacity ?? null;
    let teamSize = r.teamSize ?? null;
    let occupantCapacity = r.occupantCapacity ?? null;
    let supplyCapacity = r.supplyCapacity ?? null;

    if (r.capacity && !patientCapacity && !teamSize && !occupantCapacity && !supplyCapacity) {
      const match = r.capacity.match(/(\d+)/);
      const parsedNum = match ? parseInt(match[0], 10) : NaN;
      if (!isNaN(parsedNum)) {
        if (r.type === 'AMBULANCE') {
          patientCapacity = parsedNum;
          if (r.capacity.toLowerCase().includes('als') || r.capacity.toLowerCase().includes('critical')) {
            criticalCareCapacity = parsedNum;
          }
        } else if (r.type === 'MEDICAL_TEAM' || r.type === 'RESCUE_TEAM' || r.type === 'SEARCH_TEAM') {
          teamSize = parsedNum;
        } else if (r.type === 'SHELTER') {
          occupantCapacity = parsedNum;
        } else if (r.type === 'SUPPLY_UNIT') {
          supplyCapacity = parsedNum;
        }
      }
    }

    return {
      ...r,
      resourceCode: r.resourceCode || `RES-${r.id.slice(-4).toUpperCase()}`,
      status,
      availability,
      capabilities,
      latitude: r.latitude !== undefined ? r.latitude : null,
      longitude: r.longitude !== undefined ? r.longitude : null,
      currentIncidentId,
      assignedIncidentId: currentIncidentId,
      patientCapacity,
      criticalCareCapacity,
      teamSize,
      occupantCapacity,
      supplyCapacity
    };
  }

  public getResources(): Resource[] {
    return [...this.data.resources]
      .map(r => this.normalizeResource(r))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getResourceById(id: string): Resource | undefined {
    const res = this.data.resources.find(
      r => r.id === id || (r.resourceCode && r.resourceCode.toUpperCase() === id.toUpperCase())
    );
    return res ? this.normalizeResource(res) : undefined;
  }

  public insertResource(resource: Resource): Resource {
    this.assertOperational();
    this.data.resources.push(resource);
    this.saveSync();
    return this.normalizeResource(resource);
  }

  public updateResource(id: string, updates: Partial<Resource>): Resource | undefined {
    this.assertOperational();
    const idx = this.data.resources.findIndex(r => r.id === id || (r.resourceCode && r.resourceCode.toUpperCase() === id.toUpperCase()));
    if (idx === -1) return undefined;
    this.data.resources[idx] = {
      ...this.data.resources[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveSync();
    return this.normalizeResource(this.data.resources[idx]);
  }

  public replaceResource(resource: Resource): Resource {
    this.assertOperational();
    const idx = this.data.resources.findIndex(
      r => r.id === resource.id || (r.resourceCode && r.resourceCode.toUpperCase() === resource.id.toUpperCase())
    );
    if (idx !== -1) {
      this.data.resources[idx] = JSON.parse(JSON.stringify(resource));
    } else {
      this.data.resources.push(JSON.parse(JSON.stringify(resource)));
    }
    this.saveSync();
    return this.normalizeResource(this.data.resources[idx !== -1 ? idx : this.data.resources.length - 1]);
  }

  public getResponders(): Responder[] {
    this.data.responders = this.data.responders || [];
    return [...this.data.responders];
  }

  public getResponderByUserId(userId: string): Responder | undefined {
    this.data.responders = this.data.responders || [];
    return this.data.responders.find(r => r.userId === userId);
  }

  public insertResponder(responder: Responder): Responder {
    this.assertOperational();
    this.data.responders = this.data.responders || [];
    this.data.responders.push(responder);
    this.saveSync();
    return responder;
  }

  public allocateResource(
    resourceId: string,
    incidentId: string,
    actor?: { userId?: string; role?: string; name?: string }
  ): Resource {
    this.assertOperational();
    const resIdx = this.data.resources.findIndex(
      r => r.id === resourceId || (r.resourceCode && r.resourceCode.toUpperCase() === resourceId.toUpperCase())
    );
    if (resIdx === -1) {
      this.logAudit({
        actorId: actor?.userId,
        actorRole: actor?.role,
        actorEmail: actor?.name,
        action: 'RESOURCE_ALLOCATION_DENIED',
        entityType: 'Resource',
        entityId: resourceId,
        details: `Allocation failed: Resource "${resourceId}" not found`
      });
      throw new Error(`Resource "${resourceId}" not found`);
    }

    const targetRes = this.normalizeResource(this.data.resources[resIdx]);

    if (targetRes.status !== 'AVAILABLE') {
      this.logAudit({
        actorId: actor?.userId,
        actorRole: actor?.role,
        actorEmail: actor?.name,
        action: 'RESOURCE_ALLOCATION_DENIED',
        entityType: 'Resource',
        entityId: targetRes.id,
        details: `Allocation denied: Resource ${targetRes.name} (${targetRes.resourceCode}) is currently ${targetRes.status}`
      });
      throw new Error(`Resource "${targetRes.name}" is currently ${targetRes.status} and cannot be allocated.`);
    }

    const incident = this.data.incidents.find(i => i.id === incidentId || i.incidentNumber === incidentId);
    if (!incident) {
      this.logAudit({
        actorId: actor?.userId,
        actorRole: actor?.role,
        actorEmail: actor?.name,
        action: 'RESOURCE_ALLOCATION_DENIED',
        entityType: 'Resource',
        entityId: targetRes.id,
        details: `Allocation failed: Target incident "${incidentId}" not found`
      });
      throw new Error(`Target incident "${incidentId}" not found.`);
    }

    const now = new Date().toISOString();
    const updatedRes: Resource = {
      ...this.data.resources[resIdx],
      status: 'ASSIGNED',
      availability: 'ASSIGNED',
      currentIncidentId: incident.id,
      assignedIncidentId: incident.id,
      assignedIncidentNumber: incident.incidentNumber,
      updatedAt: now
    };

    this.data.resources[resIdx] = updatedRes;
    this.saveSync();

    this.logAudit({
      actorId: actor?.userId,
      actorRole: actor?.role,
      actorEmail: actor?.name,
      action: 'RESOURCE_ALLOCATED',
      entityType: 'Resource',
      entityId: updatedRes.id,
      details: `Allocated resource ${updatedRes.name} (${updatedRes.resourceCode || updatedRes.id}) to Incident ${incident.incidentNumber} (${incident.id})`
    });

    return this.normalizeResource(updatedRes);
  }

  public releaseResource(
    resourceId: string,
    actor?: { userId?: string; role?: string; name?: string }
  ): Resource {
    this.assertOperational();
    const resIdx = this.data.resources.findIndex(
      r => r.id === resourceId || (r.resourceCode && r.resourceCode.toUpperCase() === resourceId.toUpperCase())
    );
    if (resIdx === -1) {
      throw new Error(`Resource "${resourceId}" not found`);
    }

    const targetRes = this.normalizeResource(this.data.resources[resIdx]);

    if (targetRes.status === 'AVAILABLE' && !targetRes.currentIncidentId) {
      throw new Error(`Resource "${targetRes.name}" is not currently assigned to any incident.`);
    }

    const now = new Date().toISOString();
    const updatedRes: Resource = {
      ...this.data.resources[resIdx],
      status: 'AVAILABLE',
      availability: 'AVAILABLE',
      currentIncidentId: null,
      assignedIncidentId: undefined,
      assignedIncidentNumber: undefined,
      updatedAt: now
    };

    this.data.resources[resIdx] = updatedRes;
    this.saveSync();

    this.logAudit({
      actorId: actor?.userId,
      actorRole: actor?.role,
      actorEmail: actor?.name,
      action: 'RESOURCE_RELEASED',
      entityType: 'Resource',
      entityId: updatedRes.id,
      details: `Released resource ${updatedRes.name} (${updatedRes.resourceCode || updatedRes.id})`
    });

    return this.normalizeResource(updatedRes);
  }

  public clearDemoResources(): void {
    this.data.resources = this.data.resources.filter(r => !r.isDemoData);
    this.saveSync();
  }

  public clearResources(): void {
    this.data.resources = [];
    this.saveSync();
  }

  public clearHazards(): void {
    this.data.hazards = [];
    this.saveSync();
  }

  public clearBlockedRoads(): void {
    this.data.blockedRoads = [];
    this.saveSync();
  }

  public getIncidentById(id: string): Incident | undefined {
    return this.findIncidentById(id);
  }

  public populateDemoResources(): Resource[] {
    const demoItems: Resource[] = [
      {
        id: 'res-demo-med-01',
        resourceCode: 'AMB-101',
        name: 'Medic Unit Echo-1 [DEMO]',
        type: 'AMBULANCE',
        capabilities: ['MEDICAL'],
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        latitude: 10.0005,
        longitude: 10.0005,
        location: 'Staging Area Central (N-01)',
        capacity: '2 ALS Beds',
        statusDetails: 'Full medical inventory, 4x4 capable vehicle',
        isDemoData: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'res-demo-haz-01',
        resourceCode: 'ENG-301',
        name: 'Hazmat Fire Engine 03 [DEMO]',
        type: 'HAZMAT_UNIT',
        capabilities: ['HAZMAT', 'FIRE'],
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        latitude: 10.0100,
        longitude: 10.0100,
        location: 'Station Alpha (N-03)',
        capacity: 'Chemical Decon & Suppression',
        statusDetails: 'Equipped with Level-A suits & foam cannon',
        isDemoData: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'res-demo-sar-01',
        resourceCode: 'SAR-201',
        name: 'Mountain Search & Rescue [DEMO]',
        type: 'SEARCH_TEAM',
        capabilities: ['SEARCH', 'RESCUE'],
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        latitude: 10.0200,
        longitude: 10.0200,
        location: 'Highlands Outpost (N-06)',
        capacity: '6 Search Personnel + K9',
        statusDetails: 'Equipped with thermal imaging and winch gear',
        isDemoData: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'res-demo-sup-01',
        resourceCode: 'SUP-401',
        name: 'Supply Transport Delta [DEMO]',
        type: 'SUPPLY_UNIT',
        capabilities: ['SUPPLIES'],
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        latitude: null,
        longitude: null,
        location: 'Regional Logistics Hub',
        capacity: '5 Tons Rations & Water',
        statusDetails: 'Unmapped location test asset',
        isDemoData: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'res-demo-fire-01',
        resourceCode: 'ENG-101',
        name: 'Engine Company 1 [DEMO]',
        type: 'FIRE_UNIT',
        capabilities: ['FIRE', 'EVACUATION'],
        status: 'AVAILABLE',
        availability: 'AVAILABLE',
        latitude: 10.0050,
        longitude: 10.0050,
        location: 'Downtown Fire Station',
        capacity: '1000 GPM Pump',
        statusDetails: 'Structure fire attack squad',
        isDemoData: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const item of demoItems) {
      this.insertResource(item);
    }
    return demoItems;
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
      id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
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

  public insertAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    return this.logAudit(log);
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.data.auditLogs];
  }

  // ==========================================
  // PHASE 2: SIMULATED MESH NETWORK PERSISTENCE
  // ==========================================

  // Mesh Nodes
  public getSimulatedNodes(): SimulatedMeshNode[] {
    return [...(this.data.simulatedNodes || [])];
  }

  public findSimulatedNodeById(idOrNodeId: string): SimulatedMeshNode | undefined {
    return (this.data.simulatedNodes || []).find(
      n => n.id === idOrNodeId || n.nodeId.toUpperCase() === idOrNodeId.toUpperCase()
    );
  }

  public insertSimulatedNode(node: SimulatedMeshNode): SimulatedMeshNode {
    this.data.simulatedNodes = this.data.simulatedNodes || [];
    // Ensure unique nodeId
    const existingIdx = this.data.simulatedNodes.findIndex(
      n => n.nodeId.toUpperCase() === node.nodeId.toUpperCase() || n.id === node.id
    );
    if (existingIdx !== -1) {
      throw new Error(`A node with ID "${node.nodeId}" already exists in the simulated mesh topology.`);
    }
    this.data.simulatedNodes.push(node);
    this.saveSync();
    return node;
  }

  public updateSimulatedNode(idOrNodeId: string, updates: Partial<SimulatedMeshNode>): SimulatedMeshNode | undefined {
    this.data.simulatedNodes = this.data.simulatedNodes || [];
    const idx = this.data.simulatedNodes.findIndex(
      n => n.id === idOrNodeId || n.nodeId.toUpperCase() === idOrNodeId.toUpperCase()
    );
    if (idx === -1) return undefined;

    this.data.simulatedNodes[idx] = {
      ...this.data.simulatedNodes[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveSync();
    return this.data.simulatedNodes[idx];
  }

  public deleteSimulatedNode(idOrNodeId: string): boolean {
    this.data.simulatedNodes = this.data.simulatedNodes || [];
    const idx = this.data.simulatedNodes.findIndex(
      n => n.id === idOrNodeId || n.nodeId.toUpperCase() === idOrNodeId.toUpperCase()
    );
    if (idx === -1) return false;
    const deletedNode = this.data.simulatedNodes[idx];
    this.data.simulatedNodes.splice(idx, 1);

    // Clean up neighbor references from other nodes
    for (const node of this.data.simulatedNodes) {
      if (node.neighbors && node.neighbors.includes(deletedNode.nodeId)) {
        node.neighbors = node.neighbors.filter(nbr => nbr !== deletedNode.nodeId);
      }
    }

    this.saveSync();
    return true;
  }

  public resetSimulatedNodes(): SimulatedMeshNode[] {
    this.data.simulatedNodes = createDefaultSimulatedNodes();
    this.saveSync();
    return [...this.data.simulatedNodes];
  }

  // Mesh Packets
  public getMeshPackets(): SimulatedMeshPacket[] {
    return [...(this.data.meshPackets || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public findMeshPacketById(packetId: string): SimulatedMeshPacket | undefined {
    return (this.data.meshPackets || []).find(
      p => p.packetId.toUpperCase() === packetId.toUpperCase()
    );
  }

  public insertMeshPacket(packet: SimulatedMeshPacket): SimulatedMeshPacket {
    this.data.meshPackets = this.data.meshPackets || [];
    this.data.meshPackets.push(packet);
    if (this.data.meshPackets.length > 2000) {
      this.data.meshPackets = this.data.meshPackets.slice(-2000);
    }
    this.saveSync();
    return packet;
  }

  public updateMeshPacket(packetId: string, updates: Partial<SimulatedMeshPacket>): SimulatedMeshPacket | undefined {
    this.data.meshPackets = this.data.meshPackets || [];
    const idx = this.data.meshPackets.findIndex(
      p => p.packetId.toUpperCase() === packetId.toUpperCase()
    );
    if (idx === -1) return undefined;

    this.data.meshPackets[idx] = {
      ...this.data.meshPackets[idx],
      ...updates
    };
    this.saveSync();
    return this.data.meshPackets[idx];
  }

  // Mesh Events
  public getMeshEvents(): SimulatedMeshEvent[] {
    return [...(this.data.meshEvents || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public logMeshEvent(event: Omit<SimulatedMeshEvent, 'eventId' | 'timestamp'>): SimulatedMeshEvent {
    this.data.meshEvents = this.data.meshEvents || [];
    const newEvent: SimulatedMeshEvent = {
      ...event,
      eventId: `EVT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      timestamp: new Date().toISOString()
    };
    this.data.meshEvents.unshift(newEvent);
    if (this.data.meshEvents.length > 2000) {
      this.data.meshEvents = this.data.meshEvents.slice(0, 2000);
    }
    this.saveSync();
    return newEvent;
  }

  // Mesh Config
  public getMeshConfig(): MeshSimulationConfig {
    return { ...(this.data.meshConfig || createDefaultMeshConfig()) };
  }

  public updateMeshConfig(updates: Partial<MeshSimulationConfig>): MeshSimulationConfig {
    this.data.meshConfig = {
      ...(this.data.meshConfig || createDefaultMeshConfig()),
      ...updates
    };
    this.saveSync();
    return { ...this.data.meshConfig };
  }

  // Mesh Simulation Reset (Safe - clears ONLY simulated packets & events, does NOT touch incidents/users/resources)
  public resetMeshSimulation(): void {
    this.data.meshPackets = [];
    this.data.meshEvents = [];
    this.saveSync();
  }

  // Phase 3: AI Incident Triage Persistence
  public insertTriageRecord(record: AIIncidentTriageRecord): AIIncidentTriageRecord {
    this.data.aiTriageRecords = this.data.aiTriageRecords || [];
    this.data.aiTriageRecords.unshift(record);
    if (this.data.aiTriageRecords.length > 5000) {
      this.data.aiTriageRecords = this.data.aiTriageRecords.slice(0, 5000);
    }
    this.saveSync();
    return record;
  }

  public getTriageForIncident(incidentIdOrNumber: string): AIIncidentTriageRecord | null {
    const history = this.getTriageHistoryForIncident(incidentIdOrNumber);
    return history.length > 0 ? history[0] : null;
  }

  public getTriageHistoryForIncident(incidentIdOrNumber: string): AIIncidentTriageRecord[] {
    this.data.aiTriageRecords = this.data.aiTriageRecords || [];
    const normalizedKey = incidentIdOrNumber.trim().toUpperCase();
    return this.data.aiTriageRecords
      .filter(r => 
        (r.incidentId && r.incidentId.toUpperCase() === normalizedKey) ||
        (r.incidentNumber && r.incidentNumber.toUpperCase() === normalizedKey)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllTriageRecords(): AIIncidentTriageRecord[] {
    return [...(this.data.aiTriageRecords || [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Phase 4: GIS Hazards Persistence
  public getHazards(): Hazard[] {
    this.data.hazards = this.data.hazards || [];
    return [...this.data.hazards];
  }

  public insertHazard(hazard: Hazard): Hazard {
    this.data.hazards = this.data.hazards || [];
    const normalizedHazard = {
      ...hazard,
      hazardId: hazard.hazardId || (hazard as any).id || `haz-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    };
    this.data.hazards.push(normalizedHazard);
    if (this.data.hazards.length > 500) {
      this.data.hazards = this.data.hazards.slice(-500);
    }
    this.saveSync();
    return normalizedHazard;
  }

  public updateHazard(hazardId: string, updates: Partial<Hazard>): Hazard | null {
    this.data.hazards = this.data.hazards || [];
    const idx = this.data.hazards.findIndex(h => h.hazardId === hazardId);
    if (idx === -1) return null;
    this.data.hazards[idx] = { ...this.data.hazards[idx], ...updates };
    this.saveSync();
    return this.data.hazards[idx];
  }

  public deleteHazard(hazardId: string): boolean {
    this.data.hazards = this.data.hazards || [];
    const initialLen = this.data.hazards.length;
    this.data.hazards = this.data.hazards.filter(h => h.hazardId !== hazardId);
    if (this.data.hazards.length !== initialLen) {
      this.saveSync();
      return true;
    }
    return false;
  }

  // Phase 4: GIS Blocked Roads Persistence
  public getBlockedRoads(): BlockedRoad[] {
    this.data.blockedRoads = this.data.blockedRoads || [];
    return [...this.data.blockedRoads];
  }

  public insertBlockedRoad(br: BlockedRoad): BlockedRoad {
    this.data.blockedRoads = this.data.blockedRoads || [];
    const normalized = {
      ...br,
      blockedRoadId: br.blockedRoadId || (br as any).id || `blk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    };
    this.data.blockedRoads.push(normalized);
    if (this.data.blockedRoads.length > 500) {
      this.data.blockedRoads = this.data.blockedRoads.slice(-500);
    }
    this.saveSync();
    return normalized;
  }

  public updateBlockedRoad(blockedRoadId: string, updates: Partial<BlockedRoad>): BlockedRoad | null {
    this.data.blockedRoads = this.data.blockedRoads || [];
    const idx = this.data.blockedRoads.findIndex(b => b.blockedRoadId === blockedRoadId);
    if (idx === -1) return null;
    this.data.blockedRoads[idx] = { ...this.data.blockedRoads[idx], ...updates };
    this.saveSync();
    return this.data.blockedRoads[idx];
  }

  public deleteBlockedRoad(blockedRoadId: string): boolean {
    this.data.blockedRoads = this.data.blockedRoads || [];
    const initialLen = this.data.blockedRoads.length;
    this.data.blockedRoads = this.data.blockedRoads.filter(b => b.blockedRoadId !== blockedRoadId);
    if (this.data.blockedRoads.length !== initialLen) {
      this.saveSync();
      return true;
    }
    return false;
  }

  // Phase 4: GIS Route History Persistence
  public insertRouteResult(result: RouteResult): RouteResult {
    this.data.routeHistory = this.data.routeHistory || [];
    this.data.routeHistory.unshift(result);
    if (this.data.routeHistory.length > 200) {
      this.data.routeHistory = this.data.routeHistory.slice(0, 200);
    }
    this.saveSync();
    return result;
  }

  public getRouteResult(routeId: string): RouteResult | null {
    this.data.routeHistory = this.data.routeHistory || [];
    return this.data.routeHistory.find(r => r.routeId === routeId) || null;
  }

  public getRouteHistory(): RouteResult[] {
    this.data.routeHistory = this.data.routeHistory || [];
    return [...this.data.routeHistory];
  }

  // Phase 6: Dispatch Operations
  public getDispatches(): Dispatch[] {
    this.data.dispatches = this.data.dispatches || [];
    return [...this.data.dispatches];
  }

  public getDispatchById(id: string): Dispatch | undefined {
    this.data.dispatches = this.data.dispatches || [];
    return this.data.dispatches.find(d => d.dispatchId === id);
  }

  public insertDispatch(dispatch: Dispatch): Dispatch {
    this.assertOperational();
    this.data.dispatches = this.data.dispatches || [];
    this.data.dispatches.push(dispatch);
    this.saveSync();
    return dispatch;
  }

  public updateDispatch(id: string, updates: Partial<Dispatch>): Dispatch | undefined {
    this.assertOperational();
    this.data.dispatches = this.data.dispatches || [];
    const idx = this.data.dispatches.findIndex(d => d.dispatchId === id);
    if (idx === -1) return undefined;
    this.data.dispatches[idx] = {
      ...this.data.dispatches[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveSync();
    return this.data.dispatches[idx];
  }

  public replaceDispatch(dispatch: Dispatch): Dispatch {
    this.assertOperational();
    this.data.dispatches = this.data.dispatches || [];
    const idx = this.data.dispatches.findIndex(d => d.dispatchId === dispatch.dispatchId || (d as any).id === (dispatch as any).id);
    if (idx !== -1) {
      this.data.dispatches[idx] = JSON.parse(JSON.stringify(dispatch));
    } else {
      this.data.dispatches.push(JSON.parse(JSON.stringify(dispatch)));
    }
    this.saveSync();
    return { ...this.data.dispatches[idx !== -1 ? idx : this.data.dispatches.length - 1] };
  }

  public clearDispatches(): void {
    this.data.dispatches = [];
    this.saveSync();
  }

  // ==========================================
  // PHASE 8: EMERGENCY KNOWLEDGE & RAG PERSISTENCE
  // ==========================================

  public getKnowledgeDocuments(): KnowledgeDocument[] {
    this.data.knowledgeDocuments = this.data.knowledgeDocuments || [];
    if (this.data.knowledgeDocuments.length === 0) {
      this.data.knowledgeDocuments = [...DEFAULT_KNOWLEDGE_CORPUS];
      this.saveSync();
    }
    return [...this.data.knowledgeDocuments];
  }

  public getKnowledgeDocumentById(id: string): KnowledgeDocument | undefined {
    this.data.knowledgeDocuments = this.data.knowledgeDocuments || [];
    return this.data.knowledgeDocuments.find(d => d.id === id || d.id.toUpperCase() === id.toUpperCase());
  }

  public insertKnowledgeDocument(doc: KnowledgeDocument): KnowledgeDocument {
    this.assertOperational();
    this.data.knowledgeDocuments = this.data.knowledgeDocuments || [];
    const idx = this.data.knowledgeDocuments.findIndex(d => d.id === doc.id);
    if (idx !== -1) {
      throw new Error(`Knowledge document with ID "${doc.id}" already exists.`);
    }
    this.data.knowledgeDocuments.push(JSON.parse(JSON.stringify(doc)));
    this.saveSync();
    return doc;
  }

  public updateKnowledgeDocument(id: string, updates: Partial<KnowledgeDocument>): KnowledgeDocument {
    this.assertOperational();
    this.data.knowledgeDocuments = this.data.knowledgeDocuments || [];
    const idx = this.data.knowledgeDocuments.findIndex(d => d.id === id || d.id.toUpperCase() === id.toUpperCase());
    if (idx === -1) {
      throw new Error(`Knowledge document with ID "${id}" not found.`);
    }
    this.data.knowledgeDocuments[idx] = {
      ...this.data.knowledgeDocuments[idx],
      ...updates,
      id: this.data.knowledgeDocuments[idx].id,
      updatedAt: new Date().toISOString()
    };
    this.saveSync();
    return { ...this.data.knowledgeDocuments[idx] };
  }

  public deleteKnowledgeDocument(id: string): boolean {
    this.assertOperational();
    this.data.knowledgeDocuments = this.data.knowledgeDocuments || [];
    const initialLen = this.data.knowledgeDocuments.length;
    this.data.knowledgeDocuments = this.data.knowledgeDocuments.filter(d => d.id !== id && d.id.toUpperCase() !== id.toUpperCase());
    if (this.data.knowledgeDocuments.length !== initialLen) {
      this.saveSync();
      return true;
    }
    return false;
  }

  public clearKnowledgeDocuments(): void {
    this.assertOperational();
    this.data.knowledgeDocuments = [];
    this.saveSync();
  }

  public resetKnowledgeCorpus(): KnowledgeDocument[] {
    this.assertOperational();
    this.data.knowledgeDocuments = [...DEFAULT_KNOWLEDGE_CORPUS];
    this.saveSync();
    return [...this.data.knowledgeDocuments];
  }
}

export const db = new LocalDatabase();
