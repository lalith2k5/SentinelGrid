import { ServiceModuleInfo } from './aiTriageService.ts';

/**
 * Hazard-Aware Routing & Map Service (Architectural Placeholder - Phase 7)
 * Offline road network graph routing accounting for flood zones, collapsed bridges,
 * and active fire perimeters using local vector tiles (MBTiles/PMTiles).
 */
export class RoutingService {
  public getInfo(): ServiceModuleInfo {
    return {
      moduleName: 'Hazard-Aware Routing & Map Engine',
      phasePlanned: 7,
      isImplemented: false,
      statusText: 'Not configured — Coming in Phase 7',
      description: 'Local vector tile rendering (zero Google Maps API) and Dijkstra/A* routing that dynamically penalizes hazard zones.',
      offlineCapability: 'Pre-cached local vector map tiles and routing graphs stored on local storage.'
    };
  }
}

export const routingService = new RoutingService();
