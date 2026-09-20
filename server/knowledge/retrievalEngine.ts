import {
  KnowledgeDocument,
  RAGQueryInput,
  RetrievedEvidenceItem,
  RetrievalScoreBreakdown
} from './types.ts';

// Common stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'about', 'after', 'all', 'also', 'an', 'any', 'been', 'can',
  'do', 'get', 'got', 'had', 'have', 'how', 'if', 'into', 'just', 'more',
  'no', 'not', 'now', 'only', 'or', 'other', 'our', 'out', 'so', 'some',
  'than', 'them', 'then', 'there', 'these', 'they', 'this', 'up', 'very',
  'what', 'when', 'where', 'which', 'who', 'why', 'would'
]);

/**
 * Tokenizes text into lowercase normalized alphanumeric tokens, excluding stop words.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .split(/[\s-_]+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Category compatibility mapping between incident types/triage categories and knowledge categories.
 */
const CATEGORY_COMPATIBILITY_MAP: Record<string, string[]> = {
  MEDICAL: ['MEDICAL_EMERGENCY', 'TRAUMA_BLEEDING', 'BURNS', 'FRACTURES_DISLOCATION', 'UNCONSCIOUSNESS', 'RESPIRATORY_DISTRESS', 'CARDIAC_CHEST_PAIN', 'SEIZURES', 'DEHYDRATION_SHOCK', 'FIRST_AID', 'TRIAGE_PROTOCOLS'],
  FIRE: ['NATURAL_FIRE', 'BURNS', 'RESPIRATORY_DISTRESS', 'HAZMAT_CHEMICAL', 'RESPONDER_SAFETY', 'HAZARD_ZONE_PRECAUTIONS'],
  FLOOD: ['NATURAL_FLOOD', 'ENVIRONMENTAL_COLD', 'ELECTRICAL_HAZARDS', 'EVACUATION_SHELTER', 'SEARCH_AND_RESCUE', 'HAZARD_ZONE_PRECAUTIONS'],
  EARTHQUAKE: ['STRUCTURAL_COLLAPSE', 'FRACTURES_DISLOCATION', 'SEARCH_AND_RESCUE', 'EVACUATION_SHELTER', 'HAZARD_ZONE_PRECAUTIONS'],
  LANDSLIDE: ['LANDSLIDE', 'STRUCTURAL_COLLAPSE', 'SEARCH_AND_RESCUE', 'EVACUATION_SHELTER', 'HAZARD_ZONE_PRECAUTIONS'],
  STRUCTURAL_COLLAPSE: ['STRUCTURAL_COLLAPSE', 'SEARCH_AND_RESCUE', 'FRACTURES_DISLOCATION', 'RESPONDER_SAFETY', 'HAZARD_ZONE_PRECAUTIONS'],
  HAZMAT: ['HAZMAT_CHEMICAL', 'BURNS', 'RESPIRATORY_DISTRESS', 'ELECTRICAL_HAZARDS', 'RESPONDER_SAFETY', 'HAZARD_ZONE_PRECAUTIONS', 'HAZMAT'],
  ROAD_ACCIDENT: ['TRAUMA_BLEEDING', 'FRACTURES_DISLOCATION', 'UNCONSCIOUSNESS', 'ELECTRICAL_HAZARDS', 'RESPONDER_SAFETY', 'HAZARD_ZONE_PRECAUTIONS'],
  SECURITY: ['CROWD_SAFETY', 'EMERGENCY_COMMUNICATIONS', 'EVACUATION_SHELTER', 'RESPONDER_SAFETY'],
  MISSING_PERSON: ['SEARCH_AND_RESCUE', 'ENVIRONMENTAL_COLD', 'ENVIRONMENTAL_HEAT', 'EMERGENCY_COMMUNICATIONS'],
  EVACUATION_SHELTER: ['EVACUATION_SHELTER', 'CROWD_SAFETY', 'EMERGENCY_COMMUNICATIONS']
};

/**
 * Hazard mapping to knowledge categories and hazard tags.
 */
const HAZARD_CORRELATIONS: Record<string, string[]> = {
  FLOOD: ['NATURAL_FLOOD', 'FLOOD', 'SWIFTWATER', 'WATER', 'ELECTRICAL_HAZARDS'],
  FIRE: ['NATURAL_FIRE', 'OPEN_FLAME', 'SMOKE', 'BURNS', 'HEAT'],
  ELECTRICAL_SHOCK: ['ELECTRICAL_HAZARDS', 'ELECTRICAL', 'POWER_LINE', 'HIGH_VOLTAGE'],
  CHEMICAL_SPILL: ['HAZMAT_CHEMICAL', 'CHEMICAL_SPILL', 'TOXIC_FUMES', 'DECONTAMINATION'],
  HAZARDOUS_GAS: ['HAZMAT_CHEMICAL', 'HAZARDOUS_GAS', 'TOXIC_FUMES', 'GAS_LEAK'],
  STRUCTURAL_COLLAPSE: ['STRUCTURAL_COLLAPSE', 'RUBBLE', 'VOID', 'SHORING', 'USAR'],
  LANDSLIDE: ['LANDSLIDE', 'SLOPE_FAILURE', 'DEBRIS_FLOW', 'MUD'],
  MASS_CASUALTY: ['MEDICAL_EMERGENCY', 'MCI', 'TRIAGE', 'TRAUMA_BLEEDING'],
  BIOHAZARD: ['RESPONDER_SAFETY', 'BIOHAZARD', 'DECONTAMINATION'],
  CRUSH_HAZARD: ['CROWD_SAFETY', 'STRUCTURAL_COLLAPSE', 'ASPHYXIATION']
};

export class LocalRetrievalEngine {
  /**
   * Deterministically retrieves and ranks knowledge documents based on multi-factor scoring.
   */
  public retrieve(
    documents: KnowledgeDocument[],
    input: RAGQueryInput
  ): { items: RetrievedEvidenceItem[]; totalEvaluated: number } {
    const startTime = Date.now();
    const activeDocs = (input.includeInactive
      ? documents
      : documents.filter(d => d.status === 'ACTIVE')
    );

    // Build query tokens from query text, symptoms, and location
    const queryTokens = new Set<string>([
      ...tokenize(input.query || ''),
      ...(input.symptomsOrConditions || []).flatMap(s => tokenize(s)),
      ...tokenize(input.locationAddress || '')
    ]);

    const scoredItems: RetrievedEvidenceItem[] = [];

    for (const doc of activeDocs) {
      const breakdown: RetrievalScoreBreakdown = {
        keywordScore: 0,
        categoryScore: 0,
        hazardScore: 0,
        incidentTypeScore: 0,
        severityScore: 0,
        tagScore: 0,
        outdatedPenalty: 0,
        totalScore: 0
      };

      const matchReasons: string[] = [];
      const matchedKeywordsSet = new Set<string>();

      // 1. Keyword Overlap Scoring (BM25-style lexical frequency, max 40 pts)
      const docKeywords = (doc.keywords || []).map(k => k.toLowerCase());
      const docTags = (doc.tags || []).map(t => t.toLowerCase());
      const titleTokens = tokenize(doc.title);
      const summaryTokens = tokenize(doc.summary);
      const contentTokens = tokenize(doc.content);

      let keywordScoreAccumulator = 0;

      for (const qToken of queryTokens) {
        // Direct match with defined document keywords (high weight)
        if (docKeywords.some(k => k === qToken || k.includes(qToken))) {
          keywordScoreAccumulator += 6;
          matchedKeywordsSet.add(qToken);
        }
        // Match in title tokens (high weight)
        if (titleTokens.includes(qToken)) {
          keywordScoreAccumulator += 5;
          matchedKeywordsSet.add(qToken);
        }
        // Match in summary
        if (summaryTokens.includes(qToken)) {
          keywordScoreAccumulator += 3;
          matchedKeywordsSet.add(qToken);
        }
        // Match in content
        if (contentTokens.includes(qToken)) {
          keywordScoreAccumulator += 1;
          matchedKeywordsSet.add(qToken);
        }
      }

      breakdown.keywordScore = Math.min(40, keywordScoreAccumulator);
      if (matchedKeywordsSet.size > 0) {
        matchReasons.push(`Keywords Matched: ${Array.from(matchedKeywordsSet).slice(0, 5).join(', ')}`);
      }

      // 2. Category Relevance Scoring (max 25 pts)
      if (input.category) {
        const inputCatNorm = input.category.toUpperCase();
        const docCatNorm = (doc.category || '').toUpperCase();

        if (docCatNorm === inputCatNorm) {
          breakdown.categoryScore = 25;
          matchReasons.push(`Direct Category Match: ${doc.category}`);
        } else if (CATEGORY_COMPATIBILITY_MAP[inputCatNorm]?.includes(docCatNorm)) {
          breakdown.categoryScore = 18;
          matchReasons.push(`Compatible Category Match: ${doc.category} for ${input.category}`);
        }
      }

      // 3. Hazard Match Scoring (max 20 pts)
      if (input.hazards && input.hazards.length > 0) {
        let hazardMatchCount = 0;
        const matchedHazardNames: string[] = [];

        for (const inputHazard of input.hazards) {
          const normHazard = inputHazard.toUpperCase();
          // Check if doc explicit hazards contain input hazard
          const hasDirectHazard = (doc.hazards || []).some(
            h => h.toUpperCase() === normHazard || normHazard.includes(h.toUpperCase())
          );
          // Check correlation map
          const correlated = HAZARD_CORRELATIONS[normHazard] || [];
          const hasCorrelated = correlated.some(
            c => (doc.category || '').toUpperCase() === c || (doc.tags || []).some(t => t.toUpperCase() === c)
          );

          if (hasDirectHazard || hasCorrelated) {
            hazardMatchCount++;
            matchedHazardNames.push(inputHazard);
          }
        }

        if (hazardMatchCount > 0) {
          breakdown.hazardScore = Math.min(20, hazardMatchCount * 10);
          matchReasons.push(`Hazard Correlation (${hazardMatchCount}): ${matchedHazardNames.join(', ')}`);
        }
      }

      // 4. Incident Type Match Scoring (max 15 pts)
      if (input.category && doc.applicableIncidentTypes) {
        const inputCatNorm = input.category.toUpperCase();
        if (doc.applicableIncidentTypes.some(t => t.toUpperCase() === inputCatNorm)) {
          breakdown.incidentTypeScore = 15;
          matchReasons.push(`Incident Type Protocol: ${input.category}`);
        }
      }

      // 5. Severity Alignment Scoring (max 10 pts)
      if (input.severity) {
        const inputSevNorm = input.severity.toUpperCase();
        const docSevs = (doc.severityLevels || []).map(s => s.toUpperCase());

        if (docSevs.includes(inputSevNorm)) {
          breakdown.severityScore = 10;
          matchReasons.push(`Severity Fit: ${input.severity}`);
        } else if (
          (inputSevNorm === 'P1' || inputSevNorm === 'CRITICAL') &&
          (docSevs.includes('P1') || docSevs.includes('CRITICAL') || (doc.priority !== undefined && doc.priority >= 9))
        ) {
          breakdown.severityScore = 8;
          matchReasons.push(`High Priority Emergency Protocol`);
        } else if (
          (inputSevNorm === 'P2' || inputSevNorm === 'HIGH') &&
          (docSevs.includes('P2') || docSevs.includes('HIGH'))
        ) {
          breakdown.severityScore = 6;
        }
      }

      // 6. Tag & Operational Symptom Overlap Scoring (max 10 pts)
      if (input.symptomsOrConditions && input.symptomsOrConditions.length > 0) {
        let tagMatches = 0;
        for (const symptom of input.symptomsOrConditions) {
          const sTokens = tokenize(symptom);
          for (const sToken of sTokens) {
            if (docTags.some(t => t.includes(sToken)) || docKeywords.some(k => k.includes(sToken))) {
              tagMatches++;
            }
          }
        }
        if (tagMatches > 0) {
          breakdown.tagScore = Math.min(10, tagMatches * 3);
          matchReasons.push(`Symptom Alignment (${tagMatches} indicators)`);
        }
      }

      // 7. Base Priority Boost (0 to 5 pts based on doc priority)
      const priorityBoost = Math.round((doc.priority || 5) * 0.5);

      // Raw Sum Calculation
      const rawTotal = (
        breakdown.keywordScore +
        breakdown.categoryScore +
        breakdown.hazardScore +
        breakdown.incidentTypeScore +
        breakdown.severityScore +
        breakdown.tagScore +
        priorityBoost
      );

      // Check Outdated Status
      const isDocOutdated = this.checkIfOutdated(doc);
      if (isDocOutdated) {
        breakdown.outdatedPenalty = Math.round(rawTotal * 0.3); // 30% penalty
        matchReasons.push(`[OUTDATED REVIEW WARNING] Exceeded annual review interval.`);
      }

      // Final Normalized Score (0 to 100)
      breakdown.totalScore = Math.max(0, Math.min(100, rawTotal - breakdown.outdatedPenalty));

      // Extract relevant snippet
      const relevantSnippet = this.extractRelevantSnippet(doc, queryTokens);

      // Include if score meets minimal threshold (> 15) or direct category/hazard match
      if (breakdown.totalScore >= 15 || breakdown.categoryScore >= 18 || breakdown.hazardScore >= 10) {
        scoredItems.push({
          documentId: doc.id,
          title: doc.title,
          category: doc.category,
          version: doc.version || '1.0.0',
          source: doc.source,
          sourceOrganization: doc.sourceOrganization || 'Emergency Operations Resource Center',
          provenanceType: doc.provenanceType || 'LOCAL_DEMONSTRATION',
          lastReviewed: doc.lastReviewed || new Date().toISOString(),
          isOutdated: isDocOutdated,
          relevanceScore: breakdown.totalScore,
          scoreBreakdown: breakdown,
          matchReasons: matchReasons.length > 0 ? matchReasons : ['General operational reference'],
          matchedKeywords: Array.from(matchedKeywordsSet),
          relevantSnippet,
          actionSteps: doc.actionSteps || [],
          safetyPrecautions: doc.safetyPrecautions || [],
          contraindications: doc.contraindications || []
        });
      }
    }

    // Deterministic Sorting:
    // 1. relevanceScore DESC
    // 2. documentId ASC (stable tie-breaker)
    scoredItems.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return a.documentId.localeCompare(b.documentId);
    });

    const maxResults = input.maxResults || 5;
    const items = scoredItems.slice(0, maxResults);

    return {
      items,
      totalEvaluated: activeDocs.length
    };
  }

  /**
   * Checks if a document is outdated (older than 365 days or expired).
   */
  private checkIfOutdated(doc: KnowledgeDocument): boolean {
    if (doc.isOutdated) return true;
    if (doc.expirationDate) {
      const exp = new Date(doc.expirationDate).getTime();
      if (!isNaN(exp) && exp < Date.now()) return true;
    }
    if (doc.lastReviewed) {
      const reviewed = new Date(doc.lastReviewed).getTime();
      if (!isNaN(reviewed)) {
        const oneYearMs = 365 * 24 * 60 * 60 * 1000;
        // Check if older than 365 days relative to now
        if (Date.now() - reviewed > oneYearMs) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Extracts a concise, high-relevance snippet from document content.
   */
  private extractRelevantSnippet(doc: KnowledgeDocument, queryTokens: Set<string>): string {
    if (doc.summary) {
      return doc.summary;
    }

    const paragraphs = doc.content
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 20 && !p.startsWith('#'));

    for (const paragraph of paragraphs) {
      const pTokens = tokenize(paragraph);
      for (const qToken of queryTokens) {
        if (pTokens.includes(qToken)) {
          return paragraph.length > 250 ? paragraph.slice(0, 247) + '...' : paragraph;
        }
      }
    }

    return paragraphs[0] ? (paragraphs[0].length > 250 ? paragraphs[0].slice(0, 247) + '...' : paragraphs[0]) : doc.title;
  }
}

export const localRetrievalEngine = new LocalRetrievalEngine();
