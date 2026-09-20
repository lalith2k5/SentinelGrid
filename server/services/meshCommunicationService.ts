import { ServiceModuleInfo } from './aiTriageService.ts';
import { meshSimulationService } from './meshSimulationService.ts';
import { db } from '../db/database.ts';

/**
 * Mesh Communication Service (Phase 2 - Simulation Engine)
 * Coordinates offline-first simulated LoRa / Meshtastic packet networks,
 * multi-hop flooding routing, and emergency packet delivery.
 */
export class MeshCommunicationService {
  public getInfo(): ServiceModuleInfo {
    return {
      moduleName: 'Mesh Simulation Engine (LoRa / Meshtastic Model)',
      phasePlanned: 2,
      isImplemented: true,
      statusText: 'Operational (Virtual Mesh Simulation Mode)',
      description: 'Simulated LoRa / Meshtastic mesh packet broadcast, hop counting, TTL decrementing, duplicate detection, and decentralized emergency message routing.',
      offlineCapability: 'Radio configuration will be selected according to the applicable Indian regulatory requirements and the specific Meshtastic-compatible hardware used during the hardware integration phase. Operates with zero cell or cloud infrastructure.'
    };
  }

  public getMeshMetrics() {
    const simMetrics = meshSimulationService.getSimulationMetrics();
    const packets = db.getMeshPackets();
    const delivered = packets.filter(p => p.status === 'DELIVERED' || p.status === 'ACKNOWLEDGED');

    return {
      ...simMetrics,
      hardwareConnected: false,
      hardwareType: 'Simulated Mesh Router (Local Virtual Mode)',
      numberOfNodes: simMetrics.totalNodeCount,
      connectedNodes: simMetrics.activeNodeCount,
      packetsReceived: delivered.length,
      packetsSent: simMetrics.totalTransmitted,
      averageHopCount: simMetrics.averageHopCount,
      packetDeliveryRate: simMetrics.packetDeliveryRate,
      isConfigured: true,
      notice: 'SIMULATION MODE — No physical LoRa/Meshtastic hardware is attached. All packet routing, hop counts, latencies, and signal values are simulated locally. Radio configuration will be selected according to the applicable Indian regulatory requirements and the specific Meshtastic-compatible hardware used during the hardware integration phase.'
    };
  }
}

export const meshCommunicationService = new MeshCommunicationService();

