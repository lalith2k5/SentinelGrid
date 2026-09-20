import { db } from '../db/database.ts';
import { Incident } from '../db/schema.ts';
import { ServiceModuleInfo } from './aiTriageService.ts';
import {
  EvidenceItem,
  EvidenceConflict,
  CorroborationVerificationStatus,
  CorroborationResult,
  EvidenceType
} from '../corroboration/types.ts';
import {
  createEvidenceFingerprint,
  sanitizeEvidenceContent,
  validateEvidencePayload,
  isDirectEvidenceType,
  getBaseSourceReliability
} from '../corroboration/evidenceManager.ts';
import { corroborateIncident } from '../corroboration/corroborationEngine.ts';

export class VerificationService {
  public getInfo(): ServiceModuleInfo {
    return {
      moduleName: 'Incident Corroboration & Evidence Fusion Engine',
      phasePlanned: 9,
      isImplemented: true,
      statusText: 'OPERATIONAL — Phase 9 Active',
      description: 'Deterministic multi-source evidence fusion, location/temporal corroboration, independence grouping, conflict detection, and human verification gates.',
      offlineCapability: '100% offline local graph evidence fusion & deterministic scoring.'
    };
  }

  /**
   * Get or calculate current corroboration result for an incident
   */
  public getCorroborationResult(incidentId: string): CorroborationResult {
    const incident = db.findIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident with ID "${incidentId}" not found.`);
    }

    const evidenceItems = db.getEvidenceItems(incidentId);
    
    // Auto-seed initial report evidence if incident has no evidence yet
    if (evidenceItems.length === 0) {
      this.seedInitialReportEvidence(incident);
    }

    const updatedEvidence = db.getEvidenceItems(incidentId);
    const existingResult = db.getCorroborationResult(incidentId);
    const manualStatus = existingResult?.verificationStatus === 'CONFIRMED' || existingResult?.verificationStatus === 'DISPUTED'
      ? existingResult.verificationStatus
      : undefined;

    const result = corroborateIncident(incident, updatedEvidence, manualStatus);
    db.saveCorroborationResult(result);
    return result;
  }

  /**
   * Seed initial INCIDENT_REPORT evidence item for an incident
   */
  private seedInitialReportEvidence(incident: Incident): EvidenceItem {
    const rawContent = `${incident.title}: ${incident.description}`;
    const cleanContent = sanitizeEvidenceContent(rawContent);
    const fingerprint = createEvidenceFingerprint({
      incidentId: incident.id,
      type: 'INCIDENT_REPORT',
      sourceId: incident.reportedByUserId || 'INITIAL_REPORTER',
      content: cleanContent,
      latitude: incident.location?.latitude,
      longitude: incident.location?.longitude,
      timestamp: incident.createdAt
    });

    const item: EvidenceItem = {
      id: `ev_${incident.id}_initial`,
      incidentId: incident.id,
      type: 'INCIDENT_REPORT',
      sourceId: incident.reportedByUserId || 'INITIAL_REPORTER',
      sourceRole: 'PUBLIC_REPORTER',
      sourceDescription: incident.reportedByName || 'Initial Reporter',
      timestamp: incident.createdAt,
      latitude: incident.location?.latitude ?? null,
      longitude: incident.location?.longitude ?? null,
      content: cleanContent,
      structuredFacts: {
        severity: incident.severity,
        category: incident.title
      },
      severity: incident.severity,
      confidence: 0.8,
      reliability: 0.7,
      independenceGroup: `REPORTER-${incident.reportedByUserId || incident.reportedByName || 'ANONYMOUS'}`,
      isDirectEvidence: true,
      isDerivedEvidence: false,
      fingerprint,
      isDuplicate: false,
      createdAt: incident.createdAt
    };

    db.insertEvidenceItem(item);
    return item;
  }

  /**
   * Get all evidence items for an incident
   */
  public getEvidenceForIncident(incidentId: string): EvidenceItem[] {
    const incident = db.findIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident with ID "${incidentId}" not found.`);
    }

    const items = db.getEvidenceItems(incidentId);
    if (items.length === 0) {
      this.seedInitialReportEvidence(incident);
      return db.getEvidenceItems(incidentId);
    }
    return items;
  }

  /**
   * Submit new evidence item
   */
  public addEvidence(
    incidentId: string,
    data: any,
    actor?: { userId?: string; role?: string; name?: string }
  ): { evidence: EvidenceItem; result: CorroborationResult } {
    const incident = db.findIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident with ID "${incidentId}" not found.`);
    }

    const validation = validateEvidencePayload({ ...data, incidentId });
    if (!validation.valid) {
      throw new Error(`Invalid evidence payload: ${validation.errors.join('; ')}`);
    }

    const type: EvidenceType = data.type;
    const cleanContent = sanitizeEvidenceContent(data.content);
    const sourceId = data.sourceId || actor?.userId || 'SYSTEM';
    const sourceRole = actor?.role as any || data.sourceRole || 'PUBLIC_REPORTER';
    const sourceDescription = data.sourceDescription || actor?.name || 'Field Witness';
    const timestamp = data.timestamp || new Date().toISOString();

    const lat = data.latitude !== undefined && data.latitude !== null ? Number(data.latitude) : (incident.location?.latitude ?? null);
    const lon = data.longitude !== undefined && data.longitude !== null ? Number(data.longitude) : (incident.location?.longitude ?? null);

    const fingerprint = createEvidenceFingerprint({
      incidentId,
      type,
      sourceId,
      content: cleanContent,
      latitude: lat,
      longitude: lon,
      timestamp
    });

    const existingDuplicate = db.findEvidenceByFingerprint(fingerprint);
    const isDuplicate = Boolean(existingDuplicate);

    const baseReliability = getBaseSourceReliability(type, sourceRole);
    const isDirect = isDirectEvidenceType(type);

    const independenceGroup = data.independenceGroup || `${sourceRole}-${sourceId}`;

    const evidenceId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const evidenceItem: EvidenceItem = {
      id: evidenceId,
      incidentId,
      type,
      sourceId,
      sourceRole,
      sourceDescription,
      timestamp,
      latitude: lat,
      longitude: lon,
      locationAccuracy: data.locationAccuracy ? Number(data.locationAccuracy) : null,
      content: cleanContent,
      structuredFacts: data.structuredFacts || {},
      severity: data.severity || data.structuredFacts?.severity || null,
      victimCount: data.victimCount !== undefined ? Number(data.victimCount) : (data.structuredFacts?.victimCount !== undefined ? Number(data.structuredFacts.victimCount) : null),
      hazards: data.hazards || data.structuredFacts?.hazards || [],
      category: data.category || data.structuredFacts?.category || null,
      confidence: isDuplicate ? 0 : (data.confidence !== undefined ? Number(data.confidence) : baseReliability.reliability),
      reliability: baseReliability.reliability,
      independenceGroup,
      isDirectEvidence: isDirect,
      isDerivedEvidence: !isDirect,
      fingerprint,
      isDuplicate,
      createdAt: new Date().toISOString(),
      metadata: data.metadata || {}
    };

    db.insertEvidenceItem(evidenceItem);

    db.logAudit({
      actorId: actor?.userId,
      actorEmail: actor?.name,
      action: isDuplicate ? 'EVIDENCE_DUPLICATE_RECEIVED' : 'EVIDENCE_SUBMITTED',
      entityType: 'IncidentEvidence',
      entityId: evidenceId,
      details: `Added ${type} evidence for ${incident.incidentNumber} [Group: ${independenceGroup}, Duplicate: ${isDuplicate}]`
    });

    const result = this.recalculate(incidentId);
    return { evidence: evidenceItem, result };
  }

  /**
   * Recalculate corroboration for an incident
   */
  public recalculate(incidentId: string): CorroborationResult {
    const incident = db.findIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident with ID "${incidentId}" not found.`);
    }

    const evidence = db.getEvidenceItems(incidentId);
    const existingResult = db.getCorroborationResult(incidentId);
    const manualStatus = existingResult?.verificationStatus === 'CONFIRMED' || existingResult?.verificationStatus === 'DISPUTED'
      ? existingResult.verificationStatus
      : undefined;

    const result = corroborateIncident(incident, evidence, manualStatus);
    db.saveCorroborationResult(result);

    db.logAudit({
      action: 'CORROBORATION_RECALCULATED',
      entityType: 'IncidentCorroboration',
      entityId: incidentId,
      details: `Recalculated corroboration score for ${incident.incidentNumber}: Score ${result.corroborationScore}/100, Status: ${result.verificationStatus}`
    });

    return result;
  }

  /**
   * Manually set verification state (Requires Authorized Human: ADMIN or DISPATCHER)
   */
  public manuallyVerify(
    incidentId: string,
    targetStatus: CorroborationVerificationStatus,
    notes: string,
    actor: { userId: string; role: string; name: string }
  ): CorroborationResult {
    const incident = db.findIncidentById(incidentId);
    if (!incident) {
      throw new Error(`Incident with ID "${incidentId}" not found.`);
    }

    const validStatuses: CorroborationVerificationStatus[] = ['CONFIRMED', 'DISPUTED', 'CORROBORATED', 'UNVERIFIED'];
    if (!validStatuses.includes(targetStatus)) {
      throw new Error(`Manual verification status must be one of: ${validStatuses.join(', ')}`);
    }

    const evidence = db.getEvidenceItems(incidentId);
    const result = corroborateIncident(incident, evidence, targetStatus);

    db.saveCorroborationResult(result);

    db.logAudit({
      actorId: actor.userId,
      actorEmail: actor.name,
      action: 'INCIDENT_VERIFICATION_MUTATED',
      entityType: 'IncidentCorroboration',
      entityId: incidentId,
      details: `Manual verification set to ${targetStatus} by ${actor.name} (${actor.role}). Notes: ${notes || 'None'}`
    });

    return result;
  }

  /**
   * Authorized responder scene verification submission
   */
  public responderConfirm(
    incidentId: string,
    confirmationData: any,
    actor: { userId: string; role: string; name: string }
  ): { evidence: EvidenceItem; result: CorroborationResult } {
    const payload = {
      type: 'RESPONDER_CONFIRMATION',
      sourceId: actor.userId,
      sourceRole: 'RESPONDER',
      sourceDescription: `Responder ${actor.name}`,
      content: confirmationData.notes || `Direct scene verification confirmed by ${actor.name}.`,
      latitude: confirmationData.latitude,
      longitude: confirmationData.longitude,
      confidence: 0.95,
      structuredFacts: {
        verifiedVictimCount: confirmationData.verifiedVictimCount !== undefined ? Number(confirmationData.verifiedVictimCount) : null,
        hazards: confirmationData.hazards || [],
        severity: confirmationData.severity,
        isVerifiedVictimCount: true
      },
      independenceGroup: `RESPONDER-${actor.userId}`
    };

    return this.addEvidence(incidentId, payload, actor);
  }

  /**
   * Get conflicts list
   */
  public getConflicts(incidentId: string): EvidenceConflict[] {
    const result = this.getCorroborationResult(incidentId);
    return result.conflicts || [];
  }
}

export const verificationService = new VerificationService();
