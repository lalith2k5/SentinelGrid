import { Incident } from '../db/schema.ts';
import {
  EvidenceItem,
  EvidenceConflict,
  CorroborationVerificationStatus,
  CorroborationResult,
  CorroborationScoreBreakdown,
  EvidenceConflictType
} from './types.ts';
import { groupIndependence, isDirectEvidenceType, getBaseSourceReliability } from './evidenceManager.ts';

/**
 * Calculate Haversine distance in meters between two lat/lon coordinates.
 * Returns null if coordinates are invalid or 0,0.
 */
export function calculateHaversineDistanceMeters(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number | null {
  if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null ||
      lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) {
    return null;
  }
  // Explicitly reject (0,0) as invalid/unpopulated location
  if ((Math.abs(lat1) < 0.0001 && Math.abs(lon1) < 0.0001) ||
      (Math.abs(lat2) < 0.0001 && Math.abs(lon2) < 0.0001)) {
    return null;
  }

  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Location Assessment
 */
export function evaluateLocationAssessment(
  incident: Incident,
  evidenceItems: EvidenceItem[]
): CorroborationResult['locationAssessment'] {
  const incLat = incident.location?.latitude;
  const incLon = incident.location?.longitude;

  if (incLat === undefined || incLat === null || incLon === undefined || incLon === null ||
      (Math.abs(incLat) < 0.0001 && Math.abs(incLon) < 0.0001)) {
    return {
      status: 'LOCATION_UNAVAILABLE',
      distanceMeters: null,
      explanation: 'Incident lacks valid authoritative GPS coordinates (unavailable or 0,0).'
    };
  }

  const locationEvidence = evidenceItems.filter(e => !e.isDuplicate && e.latitude !== null && e.latitude !== undefined && e.longitude !== null && e.longitude !== undefined);

  if (locationEvidence.length === 0) {
    return {
      status: 'LOCATION_UNAVAILABLE',
      distanceMeters: null,
      explanation: 'No evidence items contain explicit scene GPS coordinates to evaluate against incident location.'
    };
  }

  let minDistance: number | null = null;
  let maxDistance = 0;

  for (const item of locationEvidence) {
    const dist = calculateHaversineDistanceMeters(incLat, incLon, item.latitude, item.longitude);
    if (dist !== null) {
      if (minDistance === null || dist < minDistance) {
        minDistance = dist;
      }
      if (dist > maxDistance) {
        maxDistance = dist;
      }
    }
  }

  if (minDistance === null) {
    return {
      status: 'LOCATION_UNAVAILABLE',
      distanceMeters: null,
      explanation: 'Unable to compute spatial distance due to invalid coordinate pairs.'
    };
  }

  if (minDistance <= 500) {
    return {
      status: 'LOCATION_CONSISTENT',
      distanceMeters: minDistance,
      explanation: `Evidence scene coordinates align within ${minDistance}m (threshold <= 500m).`
    };
  } else if (minDistance <= 2000) {
    return {
      status: 'LOCATION_PARTIALLY_CONSISTENT',
      distanceMeters: minDistance,
      explanation: `Evidence scene coordinates fall within broader grid zone (${minDistance}m from centroid, threshold <= 2000m).`
    };
  } else {
    return {
      status: 'LOCATION_INCONSISTENT',
      distanceMeters: minDistance,
      explanation: `Location spatial mismatch detected: nearest evidence is ${minDistance}m away from reported incident location (> 2000m).`
    };
  }
}

/**
 * Time Assessment
 */
export function evaluateTimeAssessment(
  incident: Incident,
  evidenceItems: EvidenceItem[]
): CorroborationResult['timeAssessment'] {
  const incTime = new Date(incident.createdAt).getTime();
  if (isNaN(incTime)) {
    return {
      status: 'TEMPORAL_UNAVAILABLE',
      timeDeltaMinutes: null,
      explanation: 'Incident creation timestamp is missing or invalid.'
    };
  }

  const validEvidence = evidenceItems.filter(e => !e.isDuplicate && e.timestamp);
  if (validEvidence.length === 0) {
    return {
      status: 'TEMPORAL_UNAVAILABLE',
      timeDeltaMinutes: null,
      explanation: 'No evidence items contain timestamp metadata.'
    };
  }

  let maxDeltaMins = 0;
  for (const item of validEvidence) {
    const itemTime = new Date(item.timestamp).getTime();
    if (!isNaN(itemTime)) {
      const deltaMins = Math.abs(itemTime - incTime) / (1000 * 60);
      if (deltaMins > maxDeltaMins) {
        maxDeltaMins = deltaMins;
      }
    }
  }

  const roundedDelta = Math.round(maxDeltaMins);

  if (roundedDelta <= 30) {
    return {
      status: 'TEMPORAL_CONSISTENT',
      timeDeltaMinutes: roundedDelta,
      explanation: `All evidence timestamps fall within a 30-minute operational window (max delta ${roundedDelta}m).`
    };
  } else if (roundedDelta <= 120) {
    return {
      status: 'TEMPORAL_PARTIALLY_CONSISTENT',
      timeDeltaMinutes: roundedDelta,
      explanation: `Evidence timestamps fall within a 2-hour window (max delta ${roundedDelta}m).`
    };
  } else {
    return {
      status: 'TEMPORAL_MISMATCH',
      timeDeltaMinutes: roundedDelta,
      explanation: `Temporal inconsistency detected: evidence spans ${roundedDelta} minutes from incident report creation (> 120m).`
    };
  }
}

/**
 * Victim Count Assessment
 */
export function evaluateVictimCountAssessment(
  incident: Incident,
  evidenceItems: EvidenceItem[]
): CorroborationResult['victimCountAssessment'] {
  const activeItems = evidenceItems.filter(e => !e.isDuplicate);

  let verifiedCount: number | null = null;
  const estimatedCounts: number[] = [];

  for (const item of activeItems) {
    if (item.type === 'RESPONDER_CONFIRMATION' || item.type === 'RESPONDER_OBSERVATION' || item.type === 'RESOURCE_OBSERVATION') {
      if (item.structuredFacts?.verifiedVictimCount !== undefined && item.structuredFacts?.verifiedVictimCount !== null) {
        verifiedCount = Number(item.structuredFacts.verifiedVictimCount);
      } else if (item.victimCount !== undefined && item.victimCount !== null && item.structuredFacts?.isVerifiedVictimCount) {
        verifiedCount = Number(item.victimCount);
      }
    }

    if (item.victimCount !== undefined && item.victimCount !== null && !item.structuredFacts?.isVerifiedVictimCount) {
      estimatedCounts.push(Number(item.victimCount));
    } else if (item.structuredFacts?.estimatedVictimCount !== undefined && item.structuredFacts?.estimatedVictimCount !== null) {
      estimatedCounts.push(Number(item.structuredFacts.estimatedVictimCount));
    }
  }

  let estimatedConsensus: number | null = null;
  if (estimatedCounts.length > 0) {
    const sum = estimatedCounts.reduce((a, b) => a + b, 0);
    estimatedConsensus = Math.round(sum / estimatedCounts.length);
  }

  let hasConflict = false;
  let explanation = 'Victim counts are consistent or unassessed.';

  if (verifiedCount !== null && estimatedConsensus !== null) {
    if (Math.abs(verifiedCount - estimatedConsensus) > 3) {
      hasConflict = true;
      explanation = `Discrepancy detected between responder-verified victim count (${verifiedCount}) and initial estimated count (${estimatedConsensus}).`;
    } else {
      explanation = `Responder on scene verified ${verifiedCount} victims (initial estimated count: ${estimatedConsensus}).`;
    }
  } else if (verifiedCount !== null) {
    explanation = `Responder on scene verified ${verifiedCount} victims.`;
  } else if (estimatedConsensus !== null) {
    explanation = `Unverified estimated victim count consensus: ${estimatedConsensus}.`;
  }

  return {
    estimatedConsensus,
    verifiedCount,
    hasConflict,
    explanation
  };
}

// Hazard Contradiction Map
const HAZARD_CONTRADICTIONS: Record<string, string[]> = {
  CHEMICAL: ['NO_CHEMICAL', 'NO_HAZARD', 'NO_CHEM'],
  HAZMAT: ['NO_HAZMAT', 'NO_HAZARD'],
  FIRE: ['NO_FIRE', 'NO_HAZARD'],
  STRUCTURAL_COLLAPSE: ['NO_STRUCTURAL_COLLAPSE', 'NO_STRUCTURAL_HAZARD', 'NO_HAZARD'],
  ELECTRICAL: ['NO_ELECTRICAL', 'NO_ELECTRICAL_HAZARD', 'NO_HAZARD'],
  FLOOD: ['NO_FLOOD', 'NO_HAZARD'],
  LANDSLIDE: ['NO_LANDSLIDE', 'NO_HAZARD']
};

function extractHazards(item: EvidenceItem): string[] {
  const set = new Set<string>();
  const hazList = item.hazards || item.structuredFacts?.hazards || [];
  for (const h of hazList) {
    if (typeof h === 'string' && h.trim()) {
      set.add(h.trim().toUpperCase());
    }
  }
  const txt = (item.content || '').toUpperCase();
  if (set.size === 0) {
    if (txt.includes('CHEMICAL')) set.add('CHEMICAL');
    if (txt.includes('NO CHEMICAL') || txt.includes('NO_CHEMICAL') || txt.includes('NO HAZMAT')) set.add('NO_CHEMICAL');
    if (txt.includes('HAZMAT')) set.add('HAZMAT');
    if (txt.includes('NO HAZARD') || txt.includes('NO_HAZARD')) set.add('NO_HAZARD');
    if (txt.includes('STRUCTURAL COLLAPSE') || txt.includes('STRUCTURAL_COLLAPSE')) set.add('STRUCTURAL_COLLAPSE');
    if (txt.includes('NO COLLAPSE') || txt.includes('NO STRUCTURAL HAZARD')) set.add('NO_STRUCTURAL_HAZARD');
    if (txt.includes('FIRE')) set.add('FIRE');
    if (txt.includes('NO FIRE') || txt.includes('NO_FIRE')) set.add('NO_FIRE');
  }
  return Array.from(set);
}

/**
 * Conflict Detection Engine
 */
export function detectConflicts(
  incident: Incident,
  evidenceItems: EvidenceItem[]
): EvidenceConflict[] {
  const conflicts: EvidenceConflict[] = [];
  const activeItems = evidenceItems.filter(e => !e.isDuplicate);

  // 1. Category Conflict Detection
  const categoriesMap = new Map<string, EvidenceItem[]>();
  for (const item of activeItems) {
    const cat = item.category || item.structuredFacts?.category;
    if (cat && cat !== 'UNKNOWN' && cat !== 'OTHER') {
      const upperCat = String(cat).toUpperCase();
      if (!categoriesMap.has(upperCat)) {
        categoriesMap.set(upperCat, []);
      }
      categoriesMap.get(upperCat)!.push(item);
    }
  }

  if (categoriesMap.size > 1) {
    const keys = Array.from(categoriesMap.keys());
    // Ignore minor overlaps like MEDICAL vs TRAUMA, but flag direct contradictions like FIRE vs FLOOD
    const k1 = keys[0];
    const k2 = keys[1];
    const itemA = categoriesMap.get(k1)![0];
    const itemB = categoriesMap.get(k2)![0];

    const isIncompatible = (
      (k1 === 'FIRE' && k2 === 'FLOOD') || (k1 === 'FLOOD' && k2 === 'FIRE') ||
      (k1 === 'HAZMAT' && k2 === 'ROAD_ACCIDENT') ||
      (k1 === 'LANDSLIDE' && k2 === 'FIRE')
    );

    conflicts.push({
      id: `conf_cat_${itemA.id}_${itemB.id}`,
      type: 'CATEGORY_CONFLICT',
      evidenceAId: itemA.id,
      evidenceBId: itemB.id,
      sourceA: itemA.sourceDescription || itemA.sourceId,
      sourceB: itemB.sourceDescription || itemB.sourceId,
      field: 'category',
      valueA: k1,
      valueB: k2,
      description: `Category discrepancy: ${itemA.sourceDescription || 'Source A'} reported ${k1} while ${itemB.sourceDescription || 'Source B'} reported ${k2}.`,
      severity: isIncompatible ? 'HIGH' : 'MEDIUM'
    });
  }

  // 2. Severity Conflict Detection
  const severityRank: Record<string, number> = {
    'P1': 4, 'CRITICAL': 4,
    'P2': 3, 'HIGH': 3,
    'P3': 2, 'MEDIUM': 2,
    'P4': 1, 'LOW': 1, 'INFORMATIONAL': 1,
    'UNKNOWN': 0
  };

  const severityItems = activeItems.filter(e => e.severity || e.structuredFacts?.severity);
  for (let i = 0; i < severityItems.length; i++) {
    for (let j = i + 1; j < severityItems.length; j++) {
      const itemA = severityItems[i];
      const itemB = severityItems[j];
      const sA = (itemA.severity || itemA.structuredFacts?.severity || '').toUpperCase();
      const sB = (itemB.severity || itemB.structuredFacts?.severity || '').toUpperCase();

      const rA = severityRank[sA] || 0;
      const rB = severityRank[sB] || 0;

      if (rA > 0 && rB > 0 && Math.abs(rA - rB) >= 2) {
        conflicts.push({
          id: `conf_sev_${itemA.id}_${itemB.id}`,
          type: 'SEVERITY_CONFLICT',
          evidenceAId: itemA.id,
          evidenceBId: itemB.id,
          sourceA: itemA.sourceDescription || itemA.sourceId,
          sourceB: itemB.sourceDescription || itemB.sourceId,
          field: 'severity',
          valueA: sA,
          valueB: sB,
          description: `Severity assessment clash: ${itemA.sourceDescription || 'Source A'} assessed ${sA} vs ${itemB.sourceDescription || 'Source B'} assessed ${sB}.`,
          severity: Math.abs(rA - rB) >= 3 ? 'CRITICAL' : 'HIGH'
        });
        break; // Only record top severity clash
      }
    }
  }

  // 3. Hazard Conflict Detection
  for (let i = 0; i < activeItems.length; i++) {
    for (let j = i + 1; j < activeItems.length; j++) {
      const itemA = activeItems[i];
      const itemB = activeItems[j];
      const hA = extractHazards(itemA);
      const hB = extractHazards(itemB);

      let contradictionFound = false;
      for (const hz1 of hA) {
        const contr1 = HAZARD_CONTRADICTIONS[hz1] || [];
        for (const hz2 of hB) {
          const contr2 = HAZARD_CONTRADICTIONS[hz2] || [];
          if (contr1.includes(hz2) || contr2.includes(hz1)) {
            contradictionFound = true;
            break;
          }
        }
        if (contradictionFound) break;
      }

      if (contradictionFound) {
        const isHigh = hA.includes('CHEMICAL') || hA.includes('HAZMAT') || hB.includes('CHEMICAL') || hB.includes('HAZMAT');
        conflicts.push({
          id: `conf_haz_${itemA.id}_${itemB.id}`,
          type: 'HAZARD_CONFLICT',
          evidenceAId: itemA.id,
          evidenceBId: itemB.id,
          sourceA: itemA.sourceDescription || itemA.sourceId,
          sourceB: itemB.sourceDescription || itemB.sourceId,
          field: 'hazards',
          valueA: hA,
          valueB: hB,
          description: `Hazard contradiction detected: ${itemA.sourceDescription || 'Source A'} reported [${hA.join(', ')}] while ${itemB.sourceDescription || 'Source B'} reported [${hB.join(', ')}].`,
          severity: isHigh ? 'CRITICAL' : 'HIGH'
        });
        break;
      }
    }
  }

  // 4. Location Conflict Detection
  const geoItems = activeItems.filter(e => e.latitude !== null && e.latitude !== undefined && e.longitude !== null && e.longitude !== undefined);
  for (let i = 0; i < geoItems.length; i++) {
    for (let j = i + 1; j < geoItems.length; j++) {
      const itemA = geoItems[i];
      const itemB = geoItems[j];
      const dist = calculateHaversineDistanceMeters(itemA.latitude, itemA.longitude, itemB.latitude, itemB.longitude);
      if (dist !== null && dist > 2000) {
        conflicts.push({
          id: `conf_loc_${itemA.id}_${itemB.id}`,
          type: 'LOCATION_CONFLICT',
          evidenceAId: itemA.id,
          evidenceBId: itemB.id,
          sourceA: itemA.sourceDescription || itemA.sourceId,
          sourceB: itemB.sourceDescription || itemB.sourceId,
          field: 'location',
          valueA: `${itemA.latitude}, ${itemA.longitude}`,
          valueB: `${itemB.latitude}, ${itemB.longitude}`,
          description: `Spatial discrepancy: Scene observations are ${dist}m apart (> 2000m).`,
          severity: dist > 5000 ? 'CRITICAL' : 'HIGH'
        });
        break;
      }
    }
  }

  // 5. Time Conflict Detection (> 120 minutes timestamp difference)
  for (let i = 0; i < activeItems.length; i++) {
    for (let j = i + 1; j < activeItems.length; j++) {
      const itemA = activeItems[i];
      const itemB = activeItems[j];
      if (itemA.timestamp && itemB.timestamp) {
        const tA = new Date(itemA.timestamp).getTime();
        const tB = new Date(itemB.timestamp).getTime();
        if (!isNaN(tA) && !isNaN(tB)) {
          const deltaMins = Math.round(Math.abs(tA - tB) / (1000 * 60));
          if (deltaMins > 120) {
            conflicts.push({
              id: `conf_time_${itemA.id}_${itemB.id}`,
              type: 'TIME_CONFLICT',
              evidenceAId: itemA.id,
              evidenceBId: itemB.id,
              sourceA: itemA.sourceDescription || itemA.sourceId,
              sourceB: itemB.sourceDescription || itemB.sourceId,
              field: 'timestamp',
              valueA: itemA.timestamp,
              valueB: itemB.timestamp,
              description: `Time conflict detected: Evidence timestamps differ by ${deltaMins} minutes (> 120 minutes threshold).`,
              severity: deltaMins > 240 ? 'CRITICAL' : 'HIGH'
            });
            break;
          }
        }
      }
    }
  }

  // 6. Victim Count Conflict Detection
  const victimAssessment = evaluateVictimCountAssessment(incident, activeItems);
  if (victimAssessment.hasConflict && victimAssessment.estimatedConsensus !== null && victimAssessment.verifiedCount !== null) {
    const itemA = activeItems.find(e => e.type === 'RESPONDER_CONFIRMATION' || e.type === 'RESPONDER_OBSERVATION') || activeItems[0];
    const itemB = activeItems.find(e => e.type === 'INCIDENT_REPORT' || e.type === 'SECONDARY_INCIDENT_REPORT') || activeItems[activeItems.length - 1];

    conflicts.push({
      id: `conf_vic_${itemA.id}_${itemB.id}`,
      type: 'VICTIM_COUNT_CONFLICT',
      evidenceAId: itemA.id,
      evidenceBId: itemB.id,
      sourceA: itemA.sourceDescription || itemA.sourceId,
      sourceB: itemB.sourceDescription || itemB.sourceId,
      field: 'victimCount',
      valueA: victimAssessment.verifiedCount,
      valueB: victimAssessment.estimatedConsensus,
      description: victimAssessment.explanation,
      severity: 'MEDIUM'
    });
  }

  // 7. Status Conflict Detection (e.g. CONTAINED vs ACTIVE_FIRE)
  for (let i = 0; i < activeItems.length; i++) {
    for (let j = i + 1; j < activeItems.length; j++) {
      const itemA = activeItems[i];
      const itemB = activeItems[j];
      const stA = String(itemA.structuredFacts?.status || (itemA.content.toLowerCase().includes('contained') ? 'CONTAINED' : '')).toUpperCase();
      const stB = String(itemB.structuredFacts?.status || (itemB.content.toLowerCase().includes('contained') ? 'CONTAINED' : '')).toUpperCase();

      const isContainedA = stA === 'CONTAINED' || itemA.content.toLowerCase().includes('contained') || itemA.content.toLowerCase().includes('extinguished');
      const isActiveB = stB === 'ACTIVE_FIRE' || stB === 'ACTIVE' || itemB.content.toLowerCase().includes('spreading') || itemB.content.toLowerCase().includes('flare-up');

      const isContainedB = stB === 'CONTAINED' || itemB.content.toLowerCase().includes('contained') || itemB.content.toLowerCase().includes('extinguished');
      const isActiveA = stA === 'ACTIVE_FIRE' || stA === 'ACTIVE' || itemA.content.toLowerCase().includes('spreading') || itemA.content.toLowerCase().includes('flare-up');

      if ((isContainedA && isActiveB) || (isContainedB && isActiveA)) {
        conflicts.push({
          id: `conf_status_${itemA.id}_${itemB.id}`,
          type: 'STATUS_CONFLICT',
          evidenceAId: itemA.id,
          evidenceBId: itemB.id,
          sourceA: itemA.sourceDescription || itemA.sourceId,
          sourceB: itemB.sourceDescription || itemB.sourceId,
          field: 'status',
          valueA: isContainedA ? 'CONTAINED' : 'ACTIVE_FIRE',
          valueB: isActiveB ? 'ACTIVE_FIRE' : 'CONTAINED',
          description: `Status conflict: ${itemA.sourceDescription || 'Source A'} reported ${isContainedA ? 'CONTAINED' : 'ACTIVE'} vs ${itemB.sourceDescription || 'Source B'} reported ${isActiveB ? 'ACTIVE' : 'CONTAINED'}.`,
          severity: 'HIGH'
        });
        break;
      }
    }
  }

  // Sort conflicts deterministically
  conflicts.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.evidenceAId !== b.evidenceAId) return a.evidenceAId.localeCompare(b.evidenceAId);
    return a.evidenceBId.localeCompare(b.evidenceBId);
  });

  return conflicts;
}

/**
 * Deterministic Evidence Fusion Scoring Model (0 - 100)
 */
export function calculateCorroborationScore(
  incident: Incident,
  evidenceItems: EvidenceItem[],
  conflicts: EvidenceConflict[]
): {
  score: number;
  breakdown: CorroborationScoreBreakdown;
  reasoning: string[];
  supportingFactors: string[];
  limitingFactors: string[];
  independentSourceCount: number;
} {
  const activeItems = evidenceItems.filter(e => !e.isDuplicate);
  const independenceMap = groupIndependence(activeItems);
  const independentSourceCount = independenceMap.size;

  const reasoning: string[] = [];
  const supportingFactors: string[] = [];
  const limitingFactors: string[] = [];

  // 1. Source Reliability Score (0 - 25 pts)
  let maxReliabilityPts = 0;
  for (const item of activeItems) {
    const base = getBaseSourceReliability(item.type, item.sourceRole);
    if (base.scorePoints > maxReliabilityPts) {
      maxReliabilityPts = base.scorePoints;
    }
  }
  if (maxReliabilityPts >= 22) {
    supportingFactors.push('High-reliability responder or official resource evidence is present (+22-25 pts).');
  } else if (maxReliabilityPts >= 15) {
    supportingFactors.push('Mesh network or structured community field reports present (+15-18 pts).');
  } else {
    limitingFactors.push('Only unverified public or automated system evidence is available (+5-10 pts).');
  }

  // 2. Directness Score (0 - 15 pts)
  let directnessPts = 5; // default for derived
  const hasResponderDirect = activeItems.some(e => e.type === 'RESPONDER_CONFIRMATION' || e.type === 'RESPONDER_OBSERVATION' || e.type === 'RESOURCE_OBSERVATION');
  const hasFieldDirect = activeItems.some(e => e.type === 'INCIDENT_REPORT' || e.type === 'SECONDARY_INCIDENT_REPORT' || e.type === 'MESH_OBSERVATION');

  if (hasResponderDirect) {
    directnessPts = 15;
    supportingFactors.push('Direct scene observation by dispatched emergency responders (+15 pts).');
  } else if (hasFieldDirect) {
    directnessPts = 10;
    supportingFactors.push('Direct scene observation by field reporters/mesh nodes (+10 pts).');
  } else {
    limitingFactors.push('Lack of direct physical scene observations (+5 pts).');
  }

  // 3. Source Independence Score (0 - 20 pts)
  let independencePts = 0;
  if (independentSourceCount >= 4) {
    independencePts = 20;
    supportingFactors.push('Extensive multi-witness corroboration across 4+ independent source groups (+20 pts).');
  } else if (independentSourceCount === 3) {
    independencePts = 15;
    supportingFactors.push('3 independent source groups corroborating incident (+15 pts).');
  } else if (independentSourceCount === 2) {
    independencePts = 10;
    supportingFactors.push('2 independent source groups corroborating incident (+10 pts).');
  } else {
    independencePts = 0;
    limitingFactors.push('Single reporting source — no independent witness corroboration (+0 pts).');
  }

  // 4. Location Consistency Score (0 - 15 pts)
  const locAssessment = evaluateLocationAssessment(incident, activeItems);
  let locationPts = 5;
  if (locAssessment.status === 'LOCATION_CONSISTENT') {
    locationPts = 15;
    supportingFactors.push('Coordinates strictly consistent within 500m (+15 pts).');
  } else if (locAssessment.status === 'LOCATION_PARTIALLY_CONSISTENT') {
    locationPts = 8;
    supportingFactors.push('Coordinates partially consistent within grid zone (+8 pts).');
  } else if (locAssessment.status === 'LOCATION_INCONSISTENT') {
    locationPts = 0;
    limitingFactors.push('Spatial mismatch between evidence coordinates and reported centroid (0 pts).');
  } else {
    locationPts = 5;
    limitingFactors.push('Incident location lacks precise GPS coordinate verification (+5 pts).');
  }

  // 5. Time Consistency Score (0 - 10 pts)
  const timeAssessment = evaluateTimeAssessment(incident, activeItems);
  let timePts = 5;
  if (timeAssessment.status === 'TEMPORAL_CONSISTENT') {
    timePts = 10;
    supportingFactors.push('Timestamps fresh within 30 minutes of incident report (+10 pts).');
  } else if (timeAssessment.status === 'TEMPORAL_PARTIALLY_CONSISTENT') {
    timePts = 6;
    supportingFactors.push('Timestamps consistent within 2 hours (+6 pts).');
  } else if (timeAssessment.status === 'TEMPORAL_MISMATCH') {
    timePts = 2;
    limitingFactors.push('Temporal lag (> 2 hours) between evidence items (+2 pts).');
  } else {
    timePts = 5;
  }

  // 6. Fact Consistency Score (0 - 15 pts)
  let factPts = 15;
  if (conflicts.length > 0) {
    factPts = 0;
    limitingFactors.push(`Fact inconsistencies detected across ${conflicts.length} conflicting field fields (0 pts).`);
  } else if (activeItems.length >= 2) {
    factPts = 15;
    supportingFactors.push('Full content alignment across reported category, severity, and hazards (+15 pts).');
  } else {
    factPts = 8;
  }

  // 7. Conflict Penalties (up to -30 pts)
  let penalty = 0;
  for (const conf of conflicts) {
    if (conf.severity === 'CRITICAL') penalty += 15;
    else if (conf.severity === 'HIGH') penalty += 10;
    else if (conf.severity === 'MEDIUM') penalty += 5;
    else penalty += 2;
  }
  penalty = Math.min(30, penalty);

  if (penalty > 0) {
    limitingFactors.push(`Applied -${penalty} pts penalty for unresolved evidence conflicts.`);
  }

  // Total Score Calculation
  const subtotal = maxReliabilityPts + directnessPts + independencePts + locationPts + timePts + factPts;
  const totalScore = Math.max(0, Math.min(100, subtotal - penalty));

  reasoning.push(`Base score calculated from ${activeItems.length} active evidence items across ${independentSourceCount} independent sources.`);
  reasoning.push(`Subtotal: ${subtotal}/100, Conflict Penalty: -${penalty}, Final Score: ${totalScore}/100.`);

  const breakdown: CorroborationScoreBreakdown = {
    sourceReliabilityScore: maxReliabilityPts,
    directnessScore: directnessPts,
    independenceScore: independencePts,
    locationConsistencyScore: locationPts,
    timeConsistencyScore: timePts,
    factConsistencyScore: factPts,
    conflictPenalty: penalty,
    totalScore
  };

  return {
    score: totalScore,
    breakdown,
    reasoning,
    supportingFactors,
    limitingFactors,
    independentSourceCount
  };
}

/**
 * Determine Corroboration Verification Status based on deterministic rules
 */
export function determineVerificationStatus(
  score: number,
  independentSourceCount: number,
  conflicts: EvidenceConflict[],
  evidenceItems: EvidenceItem[],
  currentManualOverride?: CorroborationVerificationStatus
): CorroborationVerificationStatus {
  // Manual override (e.g. set by ADMIN/DISPATCHER via /verify) takes precedence if CONFIRMED or DISPUTED
  if (currentManualOverride === 'CONFIRMED') return 'CONFIRMED';
  if (currentManualOverride === 'DISPUTED') return 'DISPUTED';

  const activeItems = evidenceItems.filter(e => !e.isDuplicate);

  // 1. Check Responder Scene Verification
  const hasResponderConfirmation = activeItems.some(e => e.type === 'RESPONDER_CONFIRMATION' || (e.type === 'RESPONDER_OBSERVATION' && e.confidence >= 0.8));
  if (hasResponderConfirmation) {
    return 'RESPONDER_VERIFIED';
  }

  // 2. Check for Material Conflicts
  const hasMaterialConflict = conflicts.some(c => c.severity === 'CRITICAL' || c.severity === 'HIGH');
  if (hasMaterialConflict) {
    return 'CONFLICTING';
  }

  const fieldItems = activeItems.filter(e =>
    e.type !== 'AI_TRIAGE_EVIDENCE' &&
    e.type !== 'RAG_KNOWLEDGE_EVIDENCE' &&
    e.type !== 'GIS_LOCATION_CONSISTENCY' &&
    e.type !== 'TIME_CONSISTENCY'
  );
  const independentFieldSourceCount = groupIndependence(fieldItems).size;

  // 3. Corroborated threshold: score >= 60, independent field sources >= 2, no critical conflicts
  if (score >= 60 && independentFieldSourceCount >= 2) {
    return 'CORROBORATED';
  }

  // 4. AI Triaged state
  const hasAITriage = activeItems.some(e => e.type === 'AI_TRIAGE_EVIDENCE');
  if (hasAITriage) {
    return 'AI_TRIAGED';
  }

  // 5. Default initial report
  if (activeItems.some(e => e.type === 'INCIDENT_REPORT' || e.type === 'SECONDARY_INCIDENT_REPORT')) {
    return 'REPORTED';
  }

  return 'UNVERIFIED';
}

/**
 * Determine Human Review Gate
 */
export function evaluateHumanReviewGate(
  score: number,
  independentSourceCount: number,
  conflicts: EvidenceConflict[],
  incident: Incident,
  evidenceItems: EvidenceItem[]
): { requiresHumanReview: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const activeItems = evidenceItems.filter(e => !e.isDuplicate);

  if (conflicts.length > 0) {
    reasons.push(`${conflicts.length} evidence conflict(s) detected requiring human triage.`);
  }

  if (independentSourceCount < 2 && activeItems.length > 0) {
    reasons.push('Single source report — lacks independent witness corroboration.');
  }

  if (score < 40) {
    reasons.push(`Low corroboration score (${score}/100) — below high-confidence automated threshold.`);
  }

  if (incident.severity === 'CRITICAL') {
    reasons.push('CRITICAL priority incident requires mandatory human commander review.');
  }

  const hasOnlyDerived = activeItems.length > 0 && activeItems.every(e => e.isDerivedEvidence || e.type === 'AI_TRIAGE_EVIDENCE' || e.type === 'RAG_KNOWLEDGE_EVIDENCE');
  if (hasOnlyDerived) {
    reasons.push('Evidence consists solely of AI/RAG system inferences without physical scene verification.');
  }

  const victimEval = evaluateVictimCountAssessment(incident, activeItems);
  if (victimEval.hasConflict) {
    reasons.push('Discrepancy detected between estimated and responder-verified victim counts.');
  }

  // Check explicit high-risk hazard triggers (CHEMICAL, HAZMAT, STRUCTURAL_COLLAPSE)
  const hazardTokens = new Set<string>();
  if (incident.title) hazardTokens.add(incident.title.toUpperCase());
  if (incident.description) hazardTokens.add(incident.description.toUpperCase());

  for (const item of activeItems) {
    if (item.content) hazardTokens.add(item.content.toUpperCase());
    const hazList = item.hazards || item.structuredFacts?.hazards || [];
    for (const h of hazList) {
      if (typeof h === 'string') hazardTokens.add(h.toUpperCase());
    }
  }

  const allHazardStr = Array.from(hazardTokens).join(' ');

  if (allHazardStr.includes('CHEMICAL') || allHazardStr.includes('CHEMICAL_HAZARD')) {
    reasons.push('CHEMICAL_HAZARD_REQUIRES_HUMAN_REVIEW: Chemical hazard present requiring human operational oversight.');
  }

  if (allHazardStr.includes('HAZMAT')) {
    reasons.push('HAZMAT_REQUIRES_HUMAN_REVIEW: HazMat incident present requiring human operational oversight.');
  }

  if (allHazardStr.includes('STRUCTURAL_COLLAPSE') || allHazardStr.includes('STRUCTURAL COLLAPSE') || allHazardStr.includes('BUILDING COLLAPSE')) {
    reasons.push('STRUCTURAL_COLLAPSE_REQUIRES_HUMAN_REVIEW: Structural collapse present requiring human operational oversight.');
  }

  return {
    requiresHumanReview: reasons.length > 0,
    reasons
  };
}

/**
 * Full Incident Corroboration Pipeline
 */
export function corroborateIncident(
  incident: Incident,
  evidenceItems: EvidenceItem[],
  manualStatusOverride?: CorroborationVerificationStatus
): CorroborationResult {
  const activeItems = evidenceItems.filter(e => !e.isDuplicate);
  const conflicts = detectConflicts(incident, activeItems);

  const {
    score,
    breakdown,
    reasoning,
    supportingFactors,
    limitingFactors,
    independentSourceCount
  } = calculateCorroborationScore(incident, activeItems, conflicts);

  const locationAssessment = evaluateLocationAssessment(incident, activeItems);
  const timeAssessment = evaluateTimeAssessment(incident, activeItems);
  const victimCountAssessment = evaluateVictimCountAssessment(incident, activeItems);

  const verificationStatus = determineVerificationStatus(
    score,
    independentSourceCount,
    conflicts,
    activeItems,
    manualStatusOverride
  );

  const { requiresHumanReview, reasons: humanReviewReasons } = evaluateHumanReviewGate(
    score,
    independentSourceCount,
    conflicts,
    incident,
    activeItems
  );

  let evidenceStrength: CorroborationResult['evidenceStrength'] = 'INSUFFICIENT';
  if (score >= 75 && independentSourceCount >= 2) evidenceStrength = 'STRONG';
  else if (score >= 55) evidenceStrength = 'MODERATE';
  else if (score >= 35) evidenceStrength = 'WEAK';

  let confidence: CorroborationResult['confidence'] = 'LOW';
  if (score >= 70 && conflicts.length === 0) confidence = 'HIGH';
  else if (score >= 45) confidence = 'MEDIUM';

  const supportingEvidence = activeItems.filter(e => !e.isConflict);
  const conflictingEvidence = activeItems.filter(e => e.isConflict || conflicts.some(c => c.evidenceAId === e.id || c.evidenceBId === e.id));

  // Extract consensus facts vs disputed facts
  const consensusFacts: Record<string, any> = {};
  const disputedFacts: Record<string, any> = {};

  if (incident.severity) consensusFacts.reportedSeverity = incident.severity;
  if (locationAssessment.status === 'LOCATION_CONSISTENT') {
    consensusFacts.locationVerified = true;
  } else if (locationAssessment.status === 'LOCATION_INCONSISTENT') {
    disputedFacts.locationMismatch = locationAssessment.explanation;
  }

  if (victimCountAssessment.verifiedCount !== null) {
    consensusFacts.verifiedVictimCount = victimCountAssessment.verifiedCount;
  } else if (victimCountAssessment.estimatedConsensus !== null) {
    consensusFacts.estimatedVictimCount = victimCountAssessment.estimatedConsensus;
  }

  for (const conf of conflicts) {
    disputedFacts[conf.field] = conf.description;
  }

  return {
    corroborationId: `corrob_${incident.id}_${Date.now()}`,
    incidentId: incident.id,
    verificationStatus,
    corroborationScore: score,
    evidenceStrength,
    confidence,
    independentSourceCount,
    totalEvidenceCount: evidenceItems.length,

    supportingEvidence,
    conflictingEvidence,
    conflicts,

    scoreBreakdown: breakdown,
    locationAssessment,
    timeAssessment,
    contentAssessment: {
      categoryConsensus: incident.title,
      severityConsensus: incident.severity,
      explanation: 'Content facts derived from field report corroboration.'
    },
    victimCountAssessment,

    consensusFacts,
    disputedFacts,

    requiresHumanReview,
    humanReviewReasons,

    reasoningSummary: reasoning.join(' '),
    supportingFactors,
    limitingFactors,
    generatedAt: new Date().toISOString(),
    disclaimer: 'Decision support reference only. Emergency evidence corroboration does not constitute clinical diagnosis or official incident confirmation without authorized human or responder verification.'
  };
}
