import crypto from 'crypto';
import { EvidenceItem, EvidenceType, StructuredFacts } from './types.ts';
import { UserRole } from '../db/schema.ts';

/**
 * Creates a deterministic fingerprint hash for an evidence payload
 * to detect duplicate reports, retries, and mesh packet retransmissions.
 */
export function createEvidenceFingerprint(params: {
  incidentId: string;
  type: EvidenceType;
  sourceId: string;
  content: string;
  latitude?: number | null;
  longitude?: number | null;
  timestamp?: string;
}): string {
  const normContent = (params.content || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const latStr = params.latitude !== undefined && params.latitude !== null ? params.latitude.toFixed(4) : '';
  const lonStr = params.longitude !== undefined && params.longitude !== null ? params.longitude.toFixed(4) : '';
  const rawKey = `${params.incidentId}|${params.type}|${params.sourceId}|${normContent}|${latStr}|${lonStr}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Clean & sanitize user/mesh/RAG evidence text against injection and HTML
 */
export function sanitizeEvidenceContent(rawText: string): string {
  if (!rawText) return '';
  let text = String(rawText);
  // Remove control characters except newline & tab
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Strip HTML script tags or dangerous markup
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[REMOVED_SCRIPT]');
  text = text.replace(/<[^>]+>/g, ''); // strip HTML tags
  if (text.length > 50000) {
    text = text.substring(0, 50000) + '...[TRUNCATED]';
  }
  return text.trim();
}

/**
 * Server-side validation of incoming evidence payload
 */
export function validateEvidencePayload(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Payload must be a JSON object'] };
  }

  if (!data.incidentId || typeof data.incidentId !== 'string') {
    errors.push('incidentId is required and must be a string');
  }

  const validTypes: EvidenceType[] = [
    'INCIDENT_REPORT',
    'SECONDARY_INCIDENT_REPORT',
    'MESH_OBSERVATION',
    'RESPONDER_CONFIRMATION',
    'RESPONDER_OBSERVATION',
    'RESOURCE_OBSERVATION',
    'GIS_LOCATION_CONSISTENCY',
    'TIME_CONSISTENCY',
    'AI_TRIAGE_EVIDENCE',
    'RAG_KNOWLEDGE_EVIDENCE'
  ];

  if (!data.type || !validTypes.includes(data.type)) {
    errors.push(`type must be one of: ${validTypes.join(', ')}`);
  }

  if (!data.content || typeof data.content !== 'string' || data.content.trim().length < 2) {
    errors.push('content is required and must be at least 2 characters long');
  }

  if (data.latitude !== undefined && data.latitude !== null) {
    const lat = Number(data.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('latitude must be a valid number between -90 and 90');
    }
  }

  if (data.longitude !== undefined && data.longitude !== null) {
    const lon = Number(data.longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) {
      errors.push('longitude must be a valid number between -180 and 180');
    }
  }

  if (data.confidence !== undefined) {
    const conf = Number(data.confidence);
    if (isNaN(conf) || conf < 0 || conf > 1) {
      errors.push('confidence must be a number between 0 and 1');
    }
  }

  if (data.reliability !== undefined) {
    const rel = Number(data.reliability);
    if (isNaN(rel) || rel < 0 || rel > 1) {
      errors.push('reliability must be a number between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Classify if evidence is Direct (scene observation) or Derived (computed/historical)
 */
export function isDirectEvidenceType(type: EvidenceType): boolean {
  return [
    'INCIDENT_REPORT',
    'SECONDARY_INCIDENT_REPORT',
    'MESH_OBSERVATION',
    'RESPONDER_CONFIRMATION',
    'RESPONDER_OBSERVATION',
    'RESOURCE_OBSERVATION'
  ].includes(type);
}

/**
 * Group evidence items by their independence group to determine non-duplicate source count
 */
export function groupIndependence(evidenceItems: EvidenceItem[]): Map<string, EvidenceItem[]> {
  const groups = new Map<string, EvidenceItem[]>();
  for (const item of evidenceItems) {
    if (item.isDuplicate) continue; // Skip duplicates
    const groupKey = item.independenceGroup || `SRC-${item.sourceId}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  }
  return groups;
}

/**
 * Get base default source reliability score for evidence type & role
 */
export function getBaseSourceReliability(type: EvidenceType, role?: string): { reliability: number; scorePoints: number } {
  switch (type) {
    case 'RESPONDER_CONFIRMATION':
      return { reliability: 0.95, scorePoints: 25 };
    case 'RESPONDER_OBSERVATION':
      return { reliability: 0.90, scorePoints: 22 };
    case 'RESOURCE_OBSERVATION':
      return { reliability: 0.85, scorePoints: 20 };
    case 'MESH_OBSERVATION':
      return { reliability: 0.75, scorePoints: 18 };
    case 'SECONDARY_INCIDENT_REPORT':
      return { reliability: 0.70, scorePoints: 16 };
    case 'INCIDENT_REPORT':
      return { reliability: 0.70, scorePoints: 15 };
    case 'GIS_LOCATION_CONSISTENCY':
      return { reliability: 0.80, scorePoints: 12 };
    case 'TIME_CONSISTENCY':
      return { reliability: 0.80, scorePoints: 10 };
    case 'AI_TRIAGE_EVIDENCE':
      return { reliability: 0.65, scorePoints: 10 };
    case 'RAG_KNOWLEDGE_EVIDENCE':
      return { reliability: 0.60, scorePoints: 5 };
    default:
      return { reliability: 0.50, scorePoints: 5 };
  }
}
