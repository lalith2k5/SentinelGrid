import crypto from 'crypto';
import { db } from '../db/database.ts';
import { aiRegistry } from '../ai/index.ts';
import { AIIncidentTriageInput, AIIncidentTriageRecord, UserRole } from '../db/schema.ts';

export class TriageService {
  /**
   * Run AI-Assisted Triage on an existing incident.
   * 
   * Strict Constraints:
   * 1. Advisory extraction only — does NOT auto-modify authoritative incident priority or status.
   * 2. Preserves existing incident data without side-effects.
   * 3. Creates a new append-only historical triage record on every execution (supports re-triage).
   * 4. Logs audit event for accountability.
   */
  public async runTriage(
    incidentIdOrNumber: string,
    requestedBy?: { userId?: string; name?: string; role?: UserRole }
  ): Promise<AIIncidentTriageRecord> {
    if (!incidentIdOrNumber || typeof incidentIdOrNumber !== 'string' || !incidentIdOrNumber.trim()) {
      throw new Error('Valid incident ID or incident number is required.');
    }

    const incident = db.findIncidentById(incidentIdOrNumber);
    if (!incident) {
      throw new Error(`Incident with identifier '${incidentIdOrNumber}' not found.`);
    }

    // Build normalized triage input
    const triageInput: AIIncidentTriageInput = {
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      title: incident.title,
      description: incident.description,
      reportedVictimCount: undefined,
      verifiedVictimCount: null, // Always null unless explicitly verified by responders
      locationAddress: incident.location?.address,
      landmark: incident.location?.landmark,
      zone: incident.location?.zone,
      gridSquare: incident.location?.gridSquare,
      latitude: incident.location?.latitude,
      longitude: incident.location?.longitude,
      status: incident.status
    };

    // Get active provider from registry
    const provider = aiRegistry.getActiveProvider();
    const extraction = await provider.triageIncident(triageInput);

    // Create unique collision-resistant triage record ID
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const triageId = `TRIAGE-${Date.now()}-${randomHex}`;
    const now = new Date().toISOString();

    const record: AIIncidentTriageRecord = {
      id: triageId,
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      category: extraction.category,
      severity: extraction.severity,
      estimatedVictimCount: extraction.estimatedVictimCount,
      verifiedVictimCount: extraction.verifiedVictimCount,
      hazards: extraction.hazards,
      symptomsOrConditions: extraction.symptomsOrConditions,
      urgency: extraction.urgency,
      locationClues: extraction.locationClues,
      confidence: extraction.confidence,
      requiresHumanReview: extraction.requiresHumanReview,
      reasoningSummary: extraction.reasoningSummary,
      provider: extraction.provider,
      providerVersion: extraction.providerVersion,
      sourceTextHash: extraction.sourceTextHash,
      createdAt: now,
      requestedByUserId: requestedBy?.userId,
      requestedByName: requestedBy?.name
    };

    // Persist append-only record into database history
    db.insertTriageRecord(record);

    // Record audit event with authoritative actor role
    db.insertAuditLog({
      actorId: requestedBy?.userId,
      actorRole: requestedBy?.role || 'SYSTEM',
      action: 'AI_TRIAGE_PERFORMED',
      entityType: 'INCIDENT',
      entityId: incident.id,
      details: JSON.stringify({
        triageId: record.id,
        incidentNumber: incident.incidentNumber,
        category: record.category,
        severity: record.severity,
        confidence: record.confidence,
        requiresHumanReview: record.requiresHumanReview,
        provider: record.provider,
        providerVersion: record.providerVersion,
        sourceTextHash: record.sourceTextHash
      })
    });

    return record;
  }

  /**
   * Get the most recent AI triage record for an incident.
   */
  public getLatestTriage(incidentIdOrNumber: string): AIIncidentTriageRecord | null {
    if (!incidentIdOrNumber || typeof incidentIdOrNumber !== 'string') {
      return null;
    }
    return db.getTriageForIncident(incidentIdOrNumber);
  }

  /**
   * Get full AI triage history for an incident (newest first).
   */
  public getTriageHistory(incidentIdOrNumber: string): AIIncidentTriageRecord[] {
    if (!incidentIdOrNumber || typeof incidentIdOrNumber !== 'string') {
      return [];
    }
    return db.getTriageHistoryForIncident(incidentIdOrNumber);
  }
}

export const triageService = new TriageService();
