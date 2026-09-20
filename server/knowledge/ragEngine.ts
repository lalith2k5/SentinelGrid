import crypto from 'crypto';
import {
  KnowledgeDocument,
  RAGQueryInput,
  RAGQueryResult,
  RAGRecommendation,
  RetrievedEvidenceItem
} from './types.ts';
import { localRetrievalEngine } from './retrievalEngine.ts';
import { CORPUS_METADATA } from './defaultCorpus.ts';

export class RAGEngine {
  /**
   * Deterministically processes a query against the offline knowledge base
   * and produces evidence-grounded decision support recommendations.
   */
  public query(
    documents: KnowledgeDocument[],
    input: RAGQueryInput,
    context?: {
      aiTriageConfidence?: number | null;
      incidentVerificationStatus?: string | null;
      requiresHumanReviewByTriage?: boolean;
    }
  ): RAGQueryResult {
    const startTime = Date.now();
    const queryId = `rag-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // 1. Retrieve & Rank Evidence
    const { items: retrievedDocuments, totalEvaluated } = localRetrievalEngine.retrieve(
      documents,
      input
    );

    const topScore = retrievedDocuments.length > 0 ? retrievedDocuments[0].relevanceScore : 0;

    // 2. Evaluate Sufficiency of Evidence
    if (retrievedDocuments.length === 0 || topScore < 20) {
      const execTime = Date.now() - startTime;
      return {
        queryId,
        incidentId: input.incidentId,
        query: input.query || `Incident ${input.incidentNumber || input.incidentId || 'Operational Context'}`,
        corpusVersion: CORPUS_METADATA.version,
        corpusName: CORPUS_METADATA.name,
        status: 'INSUFFICIENT_LOCAL_EVIDENCE',
        retrievedDocuments: [],
        evidenceSummary: 'INSUFFICIENT_LOCAL_EVIDENCE: No matching emergency operational manuals or protocols met the confidence threshold in the local offline knowledge corpus.',
        recommendations: [],
        safetyWarnings: [
          'No specific offline emergency protocol matched the requested search parameters.',
          'Standard incident command and responder safety protocols apply.'
        ],
        actionChecklist: [
          'Perform manual scene size-up and direct situational assessment.',
          'Request certified medical or HazMat specialist consultation.',
          'Verify conditions with incident commander before initiating non-standard interventions.'
        ],
        contraindications: [
          'Do NOT execute unverified technical or medical procedures without authoritative guidelines.'
        ],
        missingContextWarnings: [
          'Search criteria yielded no matching protocols with sufficient confidence score.',
          'Consider broadening search terms or specifying standard incident categories (e.g., FLOOD, MEDICAL, HAZMAT).'
        ],
        hasConflicts: false,
        conflictingDetails: null,
        retrievalConfidence: 'LOW',
        aiTriageConfidence: context?.aiTriageConfidence ?? null,
        incidentVerificationStatus: context?.incidentVerificationStatus ?? null,
        requiresHumanReview: true,
        humanReviewReasons: [
          'INSUFFICIENT_LOCAL_EVIDENCE: Local corpus does not contain high-confidence match.',
          'Human emergency dispatcher or commander must evaluate the situation manually.'
        ],
        medicalDisclaimer: CORPUS_METADATA.medicalSafetyNotice,
        isOffline: true,
        generatedAt: new Date().toISOString(),
        diagnostics: {
          executionTimeMs: execTime,
          documentsEvaluated: totalEvaluated,
          documentsMatched: 0,
          topScore: 0
        }
      };
    }

    // 3. Conflict Detection
    const conflictCheck = this.detectKnowledgeConflicts(retrievedDocuments);

    // 4. Synthesize Evidence and Actions
    const {
      recommendations,
      safetyWarnings,
      actionChecklist,
      contraindications,
      missingContextWarnings,
      evidenceSummary
    } = this.synthesizeGuidance(retrievedDocuments, input);

    // 5. Determine Retrieval Confidence
    let retrievalConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
    if (topScore >= 70 && retrievedDocuments.length >= 1) {
      retrievalConfidence = 'HIGH';
    } else if (topScore >= 40) {
      retrievalConfidence = 'MEDIUM';
    } else {
      retrievalConfidence = 'LOW';
    }

    // 6. Evaluate Human Review Gate
    const humanReviewReasons: string[] = [];

    if (conflictCheck.hasConflicts) {
      humanReviewReasons.push('CONFLICTING_KNOWLEDGE: Opposing procedural guidance detected across matched manuals.');
    }

    if (retrievalConfidence === 'LOW') {
      humanReviewReasons.push('LOW_RETRIEVAL_CONFIDENCE: Top match relevance score below 40%.');
    }

    if (retrievedDocuments.some(d => d.isOutdated)) {
      humanReviewReasons.push('OUTDATED_CORPUS_WARNING: One or more retrieved protocols exceeded the 1-year review interval.');
    }

    if (input.severity === 'P1' || input.severity === 'CRITICAL') {
      humanReviewReasons.push('HIGH_SEVERITY_INCIDENT: P1 / Critical priority requires qualified human verification.');
    }

    if (context?.requiresHumanReviewByTriage) {
      humanReviewReasons.push('AI_TRIAGE_FLAG: Preliminary AI triage indicated mandatory human review.');
    }

    if (
      retrievedDocuments.some(d =>
        d.category === 'TRAUMA_BLEEDING' ||
        d.category === 'UNCONSCIOUSNESS' ||
        d.category === 'CARDIAC_CHEST_PAIN' ||
        d.category === 'HAZMAT_CHEMICAL'
      )
    ) {
      humanReviewReasons.push('HIGH_RISK_PROTOCOL: Technical medical or hazardous chemical response requires trained supervision.');
    }

    const requiresHumanReview = humanReviewReasons.length > 0;
    const execTime = Date.now() - startTime;

    return {
      queryId,
      incidentId: input.incidentId,
      query: input.query || `Incident ${input.incidentNumber || input.incidentId || 'Operational Context'}`,
      corpusVersion: CORPUS_METADATA.version,
      corpusName: CORPUS_METADATA.name,
      status: conflictCheck.hasConflicts ? 'CONFLICTING_KNOWLEDGE' : 'SUCCESS',
      retrievedDocuments,
      evidenceSummary,
      recommendations,
      safetyWarnings,
      actionChecklist,
      contraindications,
      missingContextWarnings,
      hasConflicts: conflictCheck.hasConflicts,
      conflictingDetails: conflictCheck.hasConflicts ? conflictCheck.details : null,
      retrievalConfidence,
      aiTriageConfidence: context?.aiTriageConfidence ?? null,
      incidentVerificationStatus: context?.incidentVerificationStatus ?? null,
      requiresHumanReview,
      humanReviewReasons,
      medicalDisclaimer: CORPUS_METADATA.medicalSafetyNotice,
      isOffline: true,
      generatedAt: new Date().toISOString(),
      diagnostics: {
        executionTimeMs: execTime,
        documentsEvaluated: totalEvaluated,
        documentsMatched: retrievedDocuments.length,
        topScore
      }
    };
  }

  /**
   * Detects potential procedural contradictions between retrieved documents.
   */
  private detectKnowledgeConflicts(items: RetrievedEvidenceItem[]): {
    hasConflicts: boolean;
    details: { conflictingDocuments: string[]; description: string } | null;
  } {
    // Check for water vs water-reactive conflict
    const hasWaterAction = items.some(
      i =>
        i.actionSteps.some(a => a.toLowerCase().includes('water') || a.toLowerCase().includes('irrigate')) ||
        i.category === 'NATURAL_FLOOD'
    );
    const hasWaterContraindication = items.some(
      i =>
        (i.contraindications || []).some(c => c.toLowerCase().includes('do not wash water-reactive') || c.toLowerCase().includes('do not use water'))
    );

    if (hasWaterAction && hasWaterContraindication) {
      const conflictingDocIds = items
        .filter(i =>
          i.actionSteps.some(a => a.toLowerCase().includes('water')) ||
          (i.contraindications || []).some(c => c.toLowerCase().includes('water'))
        )
        .map(i => `${i.documentId} (${i.title})`);

      if (conflictingDocIds.length >= 2) {
        return {
          hasConflicts: true,
          details: {
            conflictingDocuments: conflictingDocIds,
            description: 'Potential water reactivity conflict detected: Standard decontamination uses water, but hazardous material contraindicates water application.'
          }
        };
      }
    }

    return { hasConflicts: false, details: null };
  }

  /**
   * Synthesizes structured recommendations, checklists, and evidence summary.
   */
  private synthesizeGuidance(
    items: RetrievedEvidenceItem[],
    input: RAGQueryInput
  ): {
    recommendations: RAGRecommendation[];
    safetyWarnings: string[];
    actionChecklist: string[];
    contraindications: string[];
    missingContextWarnings: string[];
    evidenceSummary: string;
  } {
    const recommendations: RAGRecommendation[] = [];
    const safetyWarningsSet = new Set<string>();
    const actionChecklistSet = new Set<string>();
    const contraindicationsSet = new Set<string>();
    const missingContextWarnings: string[] = [];

    // Synthesize structured recommendations from matched documents
    for (let i = 0; i < items.length; i++) {
      const doc = items[i];

      // Add document action steps to checklist
      for (const step of doc.actionSteps) {
        actionChecklistSet.add(step);
      }

      // Add safety precautions
      for (const precaution of doc.safetyPrecautions) {
        safetyWarningsSet.add(precaution);
      }

      // Add contraindications
      for (const contra of (doc.contraindications || [])) {
        contraindicationsSet.add(contra);
      }

      // Extract primary recommendation for top 3 documents
      if (i < 3 && doc.actionSteps.length > 0) {
        recommendations.push({
          id: `rec-${doc.documentId}-${i + 1}`,
          action: doc.actionSteps[0],
          rationale: `Derived from ${doc.title} (${doc.source}, v${doc.version}). Relevance score: ${doc.relevanceScore}/100.`,
          sourceDocumentId: doc.documentId,
          sourceDocumentTitle: doc.title,
          confidence: doc.relevanceScore >= 70 ? 'HIGH' : doc.relevanceScore >= 40 ? 'MEDIUM' : 'LOW',
          requiresHumanReview: doc.relevanceScore < 60 || doc.isOutdated,
          category: doc.category
        });
      }
    }

    // Context analysis warnings
    if (!input.severity) {
      missingContextWarnings.push('Incident severity level not specified; guidance generated with default operational assumptions.');
    }
    if (!input.hazards || input.hazards.length === 0) {
      missingContextWarnings.push('No environmental hazards tagged on incident record.');
    }
    if (!input.locationAddress) {
      missingContextWarnings.push('Geographic location/sector unassigned; site-specific perimeter cannot be confirmed.');
    }

    // Build evidence summary text
    const topDoc = items[0];
    const docTitles = items.slice(0, 3).map(d => `"${d.title}" (v${d.version})`).join(', ');
    const evidenceSummary = `Evidence synthesized deterministically from ${items.length} matched offline emergency protocol(s) [${docTitles}]. Primary guidance adheres to ${topDoc.title} published by ${topDoc.sourceOrganization}. Relevance match score: ${topDoc.relevanceScore}/100 based on ${topDoc.matchReasons.join('; ')}.`;

    return {
      recommendations,
      safetyWarnings: Array.from(safetyWarningsSet),
      actionChecklist: Array.from(actionChecklistSet),
      contraindications: Array.from(contraindicationsSet),
      missingContextWarnings,
      evidenceSummary
    };
  }
}

export const ragEngine = new RAGEngine();
