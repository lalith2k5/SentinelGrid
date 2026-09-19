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
        state: 'OPERATIONAL',
        stateLabel: 'Operational (Local File Engine)',
        badgeType: 'success',
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
        state: 'SIMULATION_NOT_STARTED',
        stateLabel: 'Simulation not started',
        badgeType: 'warning',
        phase: 2,
        details: meshMetrics.notice,
        offlineCapable: true
      },
      {
        id: 'ai_engine',
        name: 'AI Engine',
        state: 'NOT_CONFIGURED',
        stateLabel: 'Not configured (Phase 3)',
        badgeType: 'neutral',
        phase: 3,
        details: aiStatus.providerStatus.statusMessage,
        offlineCapable: true
      },
      {
        id: 'knowledge_base',
        name: 'Knowledge Base',
        state: 'NOT_CONFIGURED',
        stateLabel: 'Not configured (Phase 4)',
        badgeType: 'neutral',
        phase: 4,
        details: ragKnowledgeService.getInfo().statusText,
        offlineCapable: true
      },
      {
        id: 'map_system',
        name: 'Map System',
        state: 'NOT_CONFIGURED',
        stateLabel: 'Not configured (Phase 7)',
        badgeType: 'neutral',
        phase: 7,
        details: routingService.getInfo().statusText,
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
      platform: 'SentinelGrid Foundation (Phase 1)',
      zeroCloudCompliance: true,
      timestamp: new Date().toISOString(),
      subsystems,
      counts: {
        activeIncidents: db.getIncidents().filter(i => i.status === 'OPEN' || i.status === 'INVESTIGATING' || i.status === 'DISPATCHED').length,
        criticalIncidents: db.getIncidents().filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length,
        connectedMeshNodes: 0,
        availableResponders: db.getStatus().counts.responders,
        availableResources: db.getResources().filter(r => r.availability === 'AVAILABLE').length,
        pendingDispatches: 0
      },
      allPlaceholders
    };
  }
}

export const systemStatusService = new SystemStatusService();
