import { db } from '../db/database.ts';
import { aiTriageService } from './aiTriageService.ts';
import { meshCommunicationService } from './meshCommunicationService.ts';
import { ragKnowledgeService } from './ragKnowledgeService.ts';
import { routingService } from './routingService.ts';
import { priorityEngineService } from './priorityEngineService.ts';
import { resourceMatchingService } from './resourceMatchingService.ts';
import { dispatchService } from './dispatchService.ts';
import { verificationService } from './verificationService.ts';

export interface SystemComponentStatus {
  id: string;
  name: string;
  state: 'OPERATIONAL' | 'NOT_CONFIGURED' | 'SIMULATION_NOT_STARTED' | 'DEGRADED';
  stateLabel: string;
  badgeType: 'success' | 'warning' | 'neutral';
  phase: number;
  details: string;
  offlineCapable: boolean;
}

export class SystemStatusService {
  public async getComprehensiveStatus() {
    const dbStatus = db.getStatus();
    const meshMetrics = meshCommunicationService.getMeshMetrics();
    const aiStatus = await aiTriageService.getStatus();

    const subsystems: SystemComponentStatus[] = [
      {
        id: 'local_database',
        name: 'Local Database',
        state: dbStatus.status === 'DATABASE_UNAVAILABLE' ? 'DEGRADED' : 'OPERATIONAL',
        stateLabel: dbStatus.status === 'DATABASE_UNAVAILABLE'
          ? 'Degraded (Database Unavailable)'
          : 'Operational (Local File Engine)',
        badgeType: dbStatus.status === 'DATABASE_UNAVAILABLE' ? 'warning' : 'success',
        phase: 1,
        details: `Zero-cloud local storage at ${dbStatus.filePath}. Running seamlessly on local filesystem.`,
        offlineCapable: true
      },
      {
        id: 'backend_core',
        name: 'Backend Core',
        state: 'OPERATIONAL',
        stateLabel: 'Operational (Node.js/Express)',
        badgeType: 'success',
        phase: 1,
        details: 'Modular REST API, native crypto auth, zero external runtime dependencies.',
        offlineCapable: true
      },
      {
        id: 'mesh_simulator',
        name: 'Mesh Simulator',
        state: 'OPERATIONAL',
        stateLabel: 'Operational (Virtual Mesh Simulation)',
        badgeType: 'success',
        phase: 2,
        details: meshMetrics.notice,
        offlineCapable: true
      },
      {
        id: 'ai_engine',
        name: 'AI Engine',
        state: 'OPERATIONAL',
        stateLabel: 'Operational (Local Heuristic Engine 1.0)',
        badgeType: 'success',
        phase: 3,
        details: aiStatus.providerStatus.statusMessage,
        offlineCapable: true
      },
      {
        id: 'resource_matching',
        name: 'Resource Matching Engine',
        state: 'OPERATIONAL',
        stateLabel: 'Operational (Phase 5 Decision Support)',
        badgeType: 'success',
        phase: 5,
        details: resourceMatchingService.getInfo().statusText,
        offlineCapable: true
      },
      {
        id: 'dispatch_system',
        name: 'CAD & Dispatch System',
        state: 'OPERATIONAL',
        stateLabel: 'Operational (Phase 6 Workflow)',
        badgeType: 'success',
        phase: 6,
        details: dispatchService.getInfo().statusText,
        offlineCapable: true
      },
      {
        id: 'map_system',
        name: 'Offline GIS & Operational Map',
        state: 'OPERATIONAL',
        stateLabel: 'Operational (Phase 7 GIS Engine)',
        badgeType: 'success',
        phase: 7,
        details: 'Deterministic synthetic road network (25 nodes, 35 edges), 8 operational layers, multi-mode routing (FASTEST/SAFEST/BALANCED).',
        offlineCapable: true
      },
      {
        id: 'knowledge_base',
        name: 'Knowledge Base',
        state: 'NOT_CONFIGURED',
        stateLabel: 'Future (Phase 8+)',
        badgeType: 'neutral',
        phase: 8,
        details: ragKnowledgeService.getInfo().statusText,
        offlineCapable: true
      }
    ];

    const allPlaceholders = [
      aiTriageService.getInfo(),
      meshCommunicationService.getInfo(),
      priorityEngineService.getInfo(),
      ragKnowledgeService.getInfo(),
      routingService.getInfo(),
      resourceMatchingService.getInfo(),
      dispatchService.getInfo(),
      verificationService.getInfo()
    ];

    return {
      systemMode: 'OFFLINE-FIRST',
      platform: 'SentinelGrid Operations Platform (Phases 1–7)',
      zeroCloudCompliance: true,
      timestamp: new Date().toISOString(),
      subsystems,
      counts: {
        activeIncidents: db.getIncidents().filter(i => i.status === 'OPEN' || i.status === 'INVESTIGATING' || i.status === 'DISPATCHED').length,
        criticalIncidents: db.getIncidents().filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length,
        connectedMeshNodes: db.getSimulatedNodes().filter(n => n.status === 'ONLINE').length,
        availableResponders: db.getStatus().counts.responders,
        availableResources: db.getResources().filter(r => r.availability === 'AVAILABLE').length,
        pendingDispatches: db.getDispatches().filter(d => d.status === 'PENDING').length
      },
      allPlaceholders
    };
  }
}

export const systemStatusService = new SystemStatusService();
