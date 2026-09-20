import { db } from '../db/database.ts';
import {
  Resource,
  ResourceCapability,
  ResourceMatchRecommendation,
  IncidentResourceMatchingResult,
  MatchingFactors,
  RouteFeasibility,
  Incident,
  AIIncidentTriageRecord
} from '../db/schema.ts';
import { offlineMapProvider } from '../gis/OfflineMapProvider.ts';
import { RoutingEngine } from '../gis/routingEngine.ts';
import { ServiceModuleInfo } from './aiTriageService.ts';

const routingEngine = new RoutingEngine(offlineMapProvider);

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export class ResourceMatchingService {
  public getInfo(): ServiceModuleInfo {
    return {
      moduleName: 'Emergency Resource Matching Engine',
      phasePlanned: 5,
      isImplemented: true,
      statusText: 'Active — Phase 5 Operational Decision Support Engine',
      description: 'Multi-factor deterministic scoring linking incident capability requirements with offline route feasibility and unit availability.',
      offlineCapability: '100% offline-capable. Operates on local GIS graph and deterministic heuristics.'
    };
  }

  public matchResourcesForIncident(incidentId: string): IncidentResourceMatchingResult {
    const incident = db.getIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident with ID "${incidentId}" not found`);
    }

    const triageRecord = db.getTriageForIncident(incident.id);
    const hazards = db.getHazards();
    const blockedRoads = db.getBlockedRoads();
    const resources = db.getResources();

    const requiredCapabilities = this.extractRequiredCapabilities(incident, triageRecord);

    const matches: ResourceMatchRecommendation[] = resources.map(res =>
      this.evaluateResourceMatch(res, incident, triageRecord, requiredCapabilities, hazards, blockedRoads)
    );

    // Sort by matchScore descending
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Identify top recommended match
    let topFound = false;
    for (const match of matches) {
      const isEligible = 
        match.status === 'AVAILABLE' &&
        match.matchingFactors.capabilityScore > 0 &&
        (match.routeFeasibility === 'REACHABLE' || match.routeFeasibility === 'REACHABLE_WITH_HAZARD_WARNING');

      if (!topFound && isEligible) {
        match.recommendedMatch = true;
        topFound = true;
      } else {
        match.recommendedMatch = false;
      }
    }

    return {
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      incidentTitle: incident.title,
      requiredCapabilities,
      extractedRequirements: {
        category: triageRecord?.category || 'UNKNOWN',
        severity: incident.severity,
        urgency: triageRecord?.urgency || 'UNKNOWN',
        hazards: triageRecord?.hazards || [],
        estimatedVictimCount: triageRecord?.estimatedVictimCount || null,
        hasLocation: Boolean(
          incident.location &&
            incident.location.latitude != null &&
            incident.location.longitude != null &&
            !incident.location.isUnavailable
        )
      },
      matches,
      evaluatedAt: new Date().toISOString()
    };
  }

  public extractRequiredCapabilities(
    incident: Incident,
    triageRecord: AIIncidentTriageRecord | null
  ): ResourceCapability[] {
    const caps = new Set<ResourceCapability>();
    const text = `${incident.title} ${incident.description}`.toLowerCase();

    // From Triage Category or text
    const category = triageRecord?.category || '';
    if (category === 'MEDICAL' || text.includes('medical') || text.includes('victim') || text.includes('injured') || text.includes('ambulance')) {
      caps.add('MEDICAL');
    }
    if (category === 'FIRE' || text.includes('fire') || text.includes('smoke') || text.includes('blaze')) {
      caps.add('FIRE');
    }
    if (category === 'HAZMAT' || text.includes('hazmat') || text.includes('chemical') || text.includes('toxic') || text.includes('gas leak')) {
      caps.add('HAZMAT');
    }
    if (
      category === 'STRUCTURAL_COLLAPSE' ||
      category === 'ROAD_ACCIDENT' ||
      category === 'EARTHQUAKE' ||
      category === 'LANDSLIDE' ||
      text.includes('trapped') ||
      text.includes('collapse') ||
      text.includes('rescue')
    ) {
      caps.add('RESCUE');
    }
    if (category === 'MISSING_PERSON' || text.includes('missing') || text.includes('lost') || text.includes('search')) {
      caps.add('SEARCH');
    }
    if (category === 'FLOOD' || text.includes('flood') || text.includes('evacuate') || text.includes('evacuation')) {
      caps.add('EVACUATION');
      caps.add('RESCUE');
    }

    // Victim count check
    const victimCount = triageRecord?.verifiedVictimCount ?? triageRecord?.estimatedVictimCount ?? 0;
    if (victimCount > 0) {
      caps.add('MEDICAL');
    }

    // Default fallback
    if (caps.size === 0) {
      caps.add('MEDICAL');
    }

    return Array.from(caps);
  }

  private evaluateResourceMatch(
    resource: Resource,
    incident: Incident,
    triageRecord: AIIncidentTriageRecord | null,
    requiredCapabilities: ResourceCapability[],
    hazards: any[],
    blockedRoads: any[]
  ): ResourceMatchRecommendation {
    const reasons: string[] = [];
    const warnings: string[] = [];

    const resCapabilities = resource.capabilities || [];
    const status = resource.status || 'AVAILABLE';

    // 1. Capability Score
    let capabilityScore = 100;
    if (requiredCapabilities.length > 0) {
      const matched = requiredCapabilities.filter(c => resCapabilities.includes(c));
      if (matched.length === requiredCapabilities.length) {
        capabilityScore = 100;
        reasons.push(`Full capability match: ${matched.join(', ')}`);
      } else if (matched.length > 0) {
        capabilityScore = Math.round((matched.length / requiredCapabilities.length) * 100);
        reasons.push(`Partial capability match: ${matched.join(', ')}`);
        const missing = requiredCapabilities.filter(c => !resCapabilities.includes(c));
        warnings.push(`Lacks secondary required capabilities: ${missing.join(', ')}`);
      } else {
        capabilityScore = 0;
        const missing = requiredCapabilities.join(', ');
        warnings.push(`Resource lacks required capabilities: ${missing}`);
      }
    } else {
      reasons.push('General deployment compatibility');
    }

    // 2. Availability Score
    let availabilityScore = 0;
    if (status === 'AVAILABLE') {
      availabilityScore = 100;
      reasons.push('Resource is currently AVAILABLE for dispatch');
    } else {
      availabilityScore = 0;
      warnings.push(`Resource status is ${status} — unavailable for new allocation`);
    }

    // 3. Geographic Distance
    let straightLineDistanceKm: number | null = null;
    let distanceScore = 50;

    const incLat = incident.location?.latitude;
    const incLng = incident.location?.longitude;
    const resLat = resource.latitude;
    const resLng = resource.longitude;

    const hasIncCoords = incLat != null && incLng != null && !incident.location?.isUnavailable;
    const hasResCoords = resLat != null && resLng != null;

    if (hasIncCoords && hasResCoords) {
      straightLineDistanceKm = calculateHaversineDistanceKm(resLat!, resLng!, incLat!, incLng!);
      if (straightLineDistanceKm <= 1.0) {
        distanceScore = 100;
      } else if (straightLineDistanceKm <= 20.0) {
        distanceScore = Math.max(10, Math.round(100 - (straightLineDistanceKm - 1) * 4.5));
      } else {
        distanceScore = Math.max(0, Math.round(100 - straightLineDistanceKm * 3));
      }
      reasons.push(`Straight-line distance: ${straightLineDistanceKm} km`);
    } else {
      distanceScore = 50;
      if (!hasResCoords) warnings.push('Resource location coordinates unavailable');
      if (!hasIncCoords) warnings.push('Incident location coordinates unavailable');
    }

    // 4. Offline Route Feasibility & Route Safety
    let routeFeasibility: RouteFeasibility = 'LOCATION_UNAVAILABLE';
    let routeSafetyScore = 50;
    let routeInfo: any = null;

    if (hasIncCoords && hasResCoords) {
      const activeBlockedRoads = blockedRoads.filter(b => b.active);
      const activeHazards = hazards.filter(h => h.active);

      const routeResult = routingEngine.calculateRoute({
        originCoords: { latitude: resLat!, longitude: resLng! },
        destinationCoords: { latitude: incLat!, longitude: incLng! },
        mode: 'SAFEST',
        activeBlockedRoads,
        activeHazards
      });

      if (routeResult.routeStatus === 'FOUND') {
        if (routeResult.hazardPenalty > 0) {
          routeFeasibility = 'REACHABLE_WITH_HAZARD_WARNING';
          routeSafetyScore = Math.max(20, Math.round(100 - routeResult.hazardPenalty / 20));
          warnings.push(`Route traverses area with active hazard penalty (${routeResult.hazardPenalty})`);
        } else {
          routeFeasibility = 'REACHABLE';
          routeSafetyScore = 100;
          reasons.push('Clear offline route reachable without hazard exposure');
        }

        if (routeResult.blockedEdgesAvoided > 0) {
          reasons.push(`Routing engine bypassed ${routeResult.blockedEdgesAvoided} blocked road segment(s)`);
        }

        const distKm = (routeResult.distanceMeters / 1000).toFixed(2);
        const travelMin = Math.ceil(routeResult.estimatedTravelSeconds / 60);

        routeInfo = {
          routeStatus: routeResult.routeStatus,
          distanceMeters: routeResult.distanceMeters,
          travelTimeSeconds: routeResult.estimatedTravelSeconds,
          hazardPenalty: routeResult.hazardPenalty,
          avoidedHazards: routeResult.avoidedHazards,
          blockedEdgesAvoided: routeResult.blockedEdgesAvoided,
          explanation: `Offline route: ${distKm} km (~${travelMin} min travel time)`
        };
      } else if (routeResult.routeStatus === 'NO_ROUTE') {
        routeFeasibility = 'NO_SAFE_ROUTE';
        routeSafetyScore = 0;
        warnings.push('NO SAFE ROUTE: Destination is disconnected or blocked by hazards');
      } else if (routeResult.routeStatus === 'LOCATION_OUTSIDE_MAP') {
        routeFeasibility = 'OUTSIDE_OFFLINE_MAP';
        routeSafetyScore = 20;
        warnings.push('Coordinates lie outside active offline map boundaries (>5,000m)');
      } else {
        routeFeasibility = 'LOCATION_UNAVAILABLE';
        routeSafetyScore = 50;
        warnings.push('Route calculation unavailable for provided coordinates');
      }
    } else {
      routeFeasibility = 'LOCATION_UNAVAILABLE';
      routeSafetyScore = 50;
    }

    if (routeFeasibility === 'LOCATION_UNAVAILABLE') {
      if (!warnings.includes('Requires location verification')) {
        warnings.push('Requires location verification');
      }
    } else if (routeFeasibility === 'OUTSIDE_OFFLINE_MAP') {
      if (!warnings.includes('Outside offline map coverage')) {
        warnings.push('Outside offline map coverage');
      }
    }

    // 5. Hazard Compatibility
    let hazardCompatibilityScore = 100;
    const isHazmatIncident = requiredCapabilities.includes('HAZMAT');
    if (isHazmatIncident && !resCapabilities.includes('HAZMAT')) {
      hazardCompatibilityScore = 20;
      warnings.push('Resource lacks certified HAZMAT equipment for toxic/chemical hazard');
    } else if (isHazmatIncident && resCapabilities.includes('HAZMAT')) {
      hazardCompatibilityScore = 100;
      reasons.push('Certified HAZMAT unit equipped for hazardous environment');
    }

    // 6. Severity Fit Score
    let severityFitScore = 80;
    let severityFitReason = 'Severity fit: normal operational compatibility.';

    if (incident.severity === 'CRITICAL') {
      const isEmergencyCapable = resource.type === 'AMBULANCE' || resource.type === 'MEDICAL_TEAM' || resource.type === 'FIRE_UNIT' || resource.type === 'RESCUE_TEAM' || resource.type === 'HAZMAT_UNIT' || resCapabilities.includes('MEDICAL') || resCapabilities.includes('FIRE') || resCapabilities.includes('RESCUE') || resCapabilities.includes('HAZMAT');
      if (isEmergencyCapable) {
        severityFitScore = 100;
        severityFitReason = 'Severity fit: CRITICAL incident requires emergency-capable response resource.';
      } else {
        severityFitScore = 40;
        severityFitReason = 'Severity fit: CRITICAL incident has low compatibility with non-emergency resource.';
        warnings.push('Resource is non-emergency but target incident is CRITICAL');
      }
    } else if (incident.severity === 'HIGH') {
      const isEmergencyCapable = resource.type === 'AMBULANCE' || resource.type === 'MEDICAL_TEAM' || resource.type === 'FIRE_UNIT' || resource.type === 'RESCUE_TEAM' || resource.type === 'HAZMAT_UNIT' || resCapabilities.includes('MEDICAL') || resCapabilities.includes('FIRE') || resCapabilities.includes('RESCUE') || resCapabilities.includes('HAZMAT');
      if (isEmergencyCapable) {
        severityFitScore = 100;
        severityFitReason = 'Severity fit: HIGH incident matches emergency-capable response resource.';
      } else {
        severityFitScore = 60;
        severityFitReason = 'Severity fit: HIGH incident has moderate compatibility with non-emergency resource.';
        warnings.push('Resource is non-emergency and target incident is HIGH');
      }
    } else if (incident.severity === 'MEDIUM') {
      severityFitScore = 85;
      severityFitReason = 'Severity fit: MEDIUM incident is highly compatible with general or emergency response units.';
    } else if (incident.severity === 'LOW' || incident.severity === 'INFORMATIONAL') {
      const isEmergencyCapable = resource.type === 'AMBULANCE' || resource.type === 'MEDICAL_TEAM' || resource.type === 'FIRE_UNIT' || resource.type === 'RESCUE_TEAM' || resource.type === 'HAZMAT_UNIT' || resCapabilities.includes('MEDICAL') || resCapabilities.includes('FIRE') || resCapabilities.includes('RESCUE') || resCapabilities.includes('HAZMAT');
      if (isEmergencyCapable) {
        severityFitScore = 70;
        severityFitReason = 'Severity fit: LOW/INFORMATIONAL incident is best suited for general/support units to preserve high-tier emergency assets.';
      } else {
        severityFitScore = 100;
        severityFitReason = 'Severity fit: LOW/INFORMATIONAL incident is perfectly suited for general/support units.';
      }
    } else {
      severityFitScore = 80;
      severityFitReason = 'Severity fit: Not evaluated because incident severity is unknown.';
    }
    reasons.push(severityFitReason);

    // 7. Capacity Fit Score
    let capacityScore = 85;
    let capacityStatus: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT' | 'NOT_EVALUATED' = 'NOT_EVALUATED';
    let capacityReason = 'Capacity fit: not evaluated because no reliable capacity requirement is available.';

    const estimatedVictims = triageRecord?.estimatedVictimCount || 0;
    const isSupportedResourceType =
      resource.type === 'AMBULANCE' ||
      resource.type === 'MEDICAL_TEAM' ||
      resource.type === 'RESCUE_TEAM' ||
      resource.type === 'SHELTER' ||
      resource.type === 'SUPPLY_UNIT';

    if (estimatedVictims > 0 && isSupportedResourceType) {
      let capacityValue: number | null | undefined = undefined;
      let capacityTypeLabel = 'capacity';

      if (resource.type === 'AMBULANCE') {
        const isCriticalNeed = incident.severity === 'CRITICAL' || triageRecord?.severity === 'P1' || triageRecord?.urgency === 'IMMEDIATE';
        if (isCriticalNeed && resource.criticalCareCapacity != null) {
          capacityValue = resource.criticalCareCapacity;
          capacityTypeLabel = 'critical care capacity';
        } else {
          capacityValue = resource.patientCapacity;
          capacityTypeLabel = 'patient capacity';
        }
      } else if (resource.type === 'MEDICAL_TEAM') {
        capacityValue = resource.teamSize;
        capacityTypeLabel = 'team size';
      } else if (resource.type === 'RESCUE_TEAM') {
        capacityValue = resource.teamSize;
        capacityTypeLabel = 'team size';
      } else if (resource.type === 'SHELTER') {
        capacityValue = resource.occupantCapacity;
        capacityTypeLabel = 'occupant capacity';
      } else if (resource.type === 'SUPPLY_UNIT') {
        capacityValue = resource.supplyCapacity;
        capacityTypeLabel = 'supply capacity';
      }

      if (capacityValue != null) {
        if (capacityValue >= estimatedVictims) {
          capacityScore = 100;
          capacityStatus = 'SUFFICIENT';
          capacityReason = `Capacity fit: resource ${capacityTypeLabel} ${capacityValue} meets or exceeds estimated requirement ${estimatedVictims}.`;
        } else if (capacityValue >= estimatedVictims * 0.5) {
          capacityScore = 60;
          capacityStatus = 'PARTIAL';
          capacityReason = `Capacity fit: resource ${capacityTypeLabel} ${capacityValue} is below estimated requirement ${estimatedVictims}.`;
          warnings.push(`Resource ${capacityTypeLabel} ${capacityValue} is below estimated victim requirement ${estimatedVictims}`);
        } else {
          capacityScore = 30;
          capacityStatus = 'INSUFFICIENT';
          capacityReason = `Capacity fit: resource ${capacityTypeLabel} ${capacityValue} is substantially below estimated requirement ${estimatedVictims}.`;
          warnings.push(`Resource ${capacityTypeLabel} ${capacityValue} is substantially below estimated victim requirement ${estimatedVictims}`);
        }
      } else {
        capacityScore = 75;
        capacityStatus = 'NOT_EVALUATED';
        capacityReason = `Capacity fit: resource ${capacityTypeLabel} is unknown.`;
      }
    } else {
      capacityStatus = 'NOT_EVALUATED';
      capacityScore = 85;
      if (estimatedVictims <= 0) {
        capacityReason = 'Capacity fit: not evaluated because no reliable capacity requirement is available.';
      } else {
        capacityReason = `Capacity fit: not evaluated for resource type ${resource.type}.`;
      }
    }
    reasons.push(capacityReason);

    // Combine into deterministic total score with 7-factor weighted formula (0 - 100)
    let matchScore = Math.round(
      capabilityScore * 0.30 +
        availabilityScore * 0.20 +
        routeSafetyScore * 0.15 +
        distanceScore * 0.10 +
        hazardCompatibilityScore * 0.10 +
        severityFitScore * 0.10 +
        capacityScore * 0.05
    );

    // Hard overrides
    if (availabilityScore === 0) {
      matchScore = 0;
    } else if (routeFeasibility === 'NO_SAFE_ROUTE') {
      matchScore = Math.min(matchScore, 10);
    } else if (capabilityScore === 0) {
      matchScore = Math.min(matchScore, 25);
    }

    const matchingFactors: MatchingFactors = {
      capabilityScore,
      availabilityScore,
      distanceScore,
      routeSafetyScore,
      severityFitScore,
      hazardCompatibilityScore,
      capacityScore
    };

    return {
      resourceId: resource.id,
      resourceCode: resource.resourceCode || `RES-${resource.id.slice(-4).toUpperCase()}`,
      name: resource.name,
      type: resource.type,
      status,
      capabilities: resCapabilities,
      latitude: resource.latitude ?? null,
      longitude: resource.longitude ?? null,
      location: resource.location,
      capacity: resource.capacity ?? null,
      patientCapacity: resource.patientCapacity ?? null,
      criticalCareCapacity: resource.criticalCareCapacity ?? null,
      teamSize: resource.teamSize ?? null,
      occupantCapacity: resource.occupantCapacity ?? null,
      supplyCapacity: resource.supplyCapacity ?? null,
      capacityStatus,
      capacityReason,
      currentIncidentId: resource.currentIncidentId ?? null,

      matchScore,
      recommendedMatch: false,
      matchingFactors,
      factors: matchingFactors,

      straightLineDistanceKm,
      routeFeasibility,
      routeInfo,

      reasons,
      warnings
    };
  }
}

export const resourceMatchingService = new ResourceMatchingService();
