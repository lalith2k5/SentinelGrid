import { ServiceModuleInfo } from './aiTriageService.ts';

/**
 * Mesh Communication Service (Architectural Placeholder - Phase 2)
 * Designed for simulated LoRa / Meshtastic packet networks, multi-hop packet routing,
 * and decentralized message delivery without internet.
 */
export class MeshCommunicationService {
  public getInfo(): ServiceModuleInfo {
    return {
      moduleName: 'Mesh Communication & LoRa Engine',
      phasePlanned: 2,
      isImplemented: false,
      statusText: 'Simulation not started — Coming in Phase 2',
      description: 'Simulated LoRa / Meshtastic mesh packet broadcast, hop counting, and decentralized emergency message routing.',
      offlineCapability: 'Operates over unlicensed ISM bands (915MHz/868MHz/433MHz) with zero cell or cloud infrastructure.'
    };
  }

  public getMeshMetrics() {
    return {
      meshStatus: 'Simulation not started',
      hardwareConnected: false,
      hardwareType: 'None (Simulation mode planned)',
      numberOfNodes: 0,
      connectedNodes: 0,
      packetsReceived: 0,
      packetsSent: 0,
      averageHopCount: 0,
      packetDeliveryRate: '0.0%',
      isConfigured: false,
      notice: 'Phase 1 foundation: No LoRa hardware is connected. Simulation engine initializes in Phase 2.'
    };
  }
}

export const meshCommunicationService = new MeshCommunicationService();
