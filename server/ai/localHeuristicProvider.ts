import crypto from 'crypto';
import {
  AIProvider,
  AIProviderStatus,
  AIIncidentTriageInput,
  AIIncidentTriageRecord,
  TriageCategory,
  TriageSeverity,
  TriageUrgency
} from './types.ts';

/**
 * LocalHeuristicProvider (Phase 3 Active Provider)
 * 
 * 100% Offline, Deterministic Rule-Based Triage & Extraction Engine.
 * 
 * ARCHITECTURAL INTEGRITY GUARANTEES:
 * - NO cloud APIs (Zero Gemini, Zero OpenAI, Zero remote inference).
 * - NO autonomous medical diagnosis or treatment prescribing.
 * - Extracts structured operational emergency intelligence (hazards, victim estimates, urgency indicators).
 * - Distinguishes estimated victim counts from verified counts (never converts estimated to verified).
 * - Never fabricates GPS coordinates or replaces missing location with synthetic data.
 * - Source text is SHA-256 hashed for auditability.
 * - Incident text is treated strictly as untrusted DATA (prompt injection defense).
 */
export class LocalHeuristicProvider implements AIProvider {
  public id = 'local-heuristic';
  public name = 'Local Heuristic Triage Engine';
  public version = '1.0';

  public async isAvailable(): Promise<boolean> {
    return true; // Always available offline
  }

  public async getStatus(): Promise<AIProviderStatus> {
    return {
      providerId: this.id,
      displayName: this.name,
      providerVersion: this.version,
      isConfigured: true,
      statusMessage: 'AVAILABLE (Offline deterministic rule-based triage)',
      requiresInternet: false,
      localCompatible: true,
      isOffline: true,
      modelIdentifier: 'heuristic-ruleset-v1.0'
    };
  }

  public async triageIncident(input: AIIncidentTriageInput): Promise<Omit<AIIncidentTriageRecord, 'id' | 'createdAt'>> {
    // 1. Build and normalize raw text
    const rawParts = [
      input.title || '',
      input.description || '',
      input.locationAddress || '',
      input.landmark || '',
      input.zone || '',
      input.gridSquare || ''
    ].filter(Boolean);

    const rawCombinedText = rawParts.join(' ');
    const normalizedText = rawCombinedText.toLowerCase().replace(/[^\w\s\-\#]/g, ' ').replace(/\s+/g, ' ').trim();

    // 2. Compute SHA-256 Source Text Hash for audit traceability
    const sourceTextHash = crypto
      .createHash('sha256')
      .update(rawCombinedText.trim())
      .digest('hex');

    // 3. Category Detection with Deterministic Precedence
    const { category, categoryMatches, isConflicted } = this.extractCategory(normalizedText);

    // 4. Severity & Urgency Extraction
    const { severity, urgency, severityIndicators } = this.extractSeverity(normalizedText);

    // 5. Victim Count Estimation & Distinction
    const { estimatedVictimCount, verifiedVictimCount, victimIndicators } = this.extractVictimCounts(normalizedText, input);

    // 6. Hazard & Condition Extractions
    const hazards = this.extractHazards(normalizedText);
    const symptomsOrConditions = this.extractSymptoms(normalizedText);

    // 7. Location Clue Extraction (Never fabricates coordinates)
    const locationClues = this.extractLocationClues(rawCombinedText, input);

    // 8. Confidence Calculation
    const confidence = this.calculateConfidence({
      normalizedText,
      category,
      severity,
      categoryMatchesCount: categoryMatches.length,
      severityIndicatorsCount: severityIndicators.length,
      isConflicted,
      locationCluesCount: locationClues.length
    });

    // 9. Human Review Flagging
    const { requiresHumanReview, reviewReasons } = this.evaluateHumanReview({
      confidence,
      severity,
      category,
      isConflicted,
      estimatedVictimCount,
      locationClues,
      normalizedText,
      hasCoordinates: input.latitude !== null && input.latitude !== undefined && input.longitude !== null && input.longitude !== undefined
    });

    // 10. Construct Reasoning Summary (Strictly operational indicators, never medical claims)
    const allIndicators = [
      ...severityIndicators,
      ...categoryMatches.map(c => `category:${c}`),
      ...hazards.map(h => `hazard:${h}`),
      ...symptomsOrConditions.map(s => `condition:${s}`),
      ...victimIndicators
    ];

    const indicatorText = allIndicators.length > 0
      ? `Detected ${allIndicators.length} operational indicators (${allIndicators.slice(0, 6).join(', ')}${allIndicators.length > 6 ? '...' : ''}).`
      : 'Insufficient distinct indicators detected in incident text.';

    const reviewText = requiresHumanReview
      ? `Human review flagged: ${reviewReasons.join('; ')}.`
      : 'Standard local heuristic threshold met.';

    const reasoningSummary = `${indicatorText} Classified as ${severity} (${urgency}) priority under ${category} category. ${reviewText}`;

    return {
      incidentId: input.incidentId || '',
      incidentNumber: input.incidentNumber,
      category,
      severity,
      estimatedVictimCount,
      verifiedVictimCount,
      hazards,
      symptomsOrConditions,
      urgency,
      locationClues,
      confidence,
      requiresHumanReview,
      reasoningSummary,
      provider: 'LOCAL_HEURISTIC',
      providerVersion: this.version,
      sourceTextHash
    };
  }

  // --- EXTRACTION HELPERS ---

  private extractCategory(text: string): { category: TriageCategory; categoryMatches: TriageCategory[]; isConflicted: boolean } {
    if (!text || text.trim().length === 0) {
      return { category: 'UNKNOWN', categoryMatches: [], isConflicted: false };
    }

    const matches: TriageCategory[] = [];

    // Keyword groups
    if (this.matchesAny(text, ['chemical', 'gas leak', 'toxic', 'hazmat', 'radiation', 'acid spill', 'chlorine', 'ammonia', 'hazardous material', 'fumes', 'poisonous gas', 'cyanide', 'biohazard'])) {
      matches.push('HAZMAT');
    }
    if (this.matchesAny(text, ['structural collapse', 'building collapse', 'roof collapse', 'bridge collapse', 'wall collapsed', 'debris trapped', 'rubble', 'trapped under rubble', 'cave-in', 'collapsed building', 'ceiling collapsed'])) {
      matches.push('STRUCTURAL_COLLAPSE');
    }
    if (this.matchesAny(text, ['earthquake', 'tremor', 'seismic', 'aftershock', 'quake', 'ground shaking', 'richter'])) {
      matches.push('EARTHQUAKE');
    }
    if (this.matchesAny(text, ['landslide', 'mudslide', 'rockslide', 'debris flow', 'slope failure', 'hill collapsed', 'mud slip'])) {
      matches.push('LANDSLIDE');
    }
    if (this.matchesAny(text, ['flood', 'flooding', 'water rising', 'submerged', 'flash flood', 'inundation', 'overflowing river', 'drowning', 'water level rising', 'inundated'])) {
      matches.push('FLOOD');
    }
    if (this.matchesAny(text, ['fire', 'flames', 'burning', 'smoke', 'wildfire', 'blaze', 'inferno', 'explosion', 'ignited', 'structure fire', 'forest fire', 'gas explosion', 'combustion'])) {
      matches.push('FIRE');
    }
    if (this.matchesAny(text, ['collision', 'crash', 'vehicle accident', 'car crash', 'bus collision', 'truck crash', 'overturned vehicle', 'pedestrian hit', 'highway accident', 'multi-vehicle pileup', 'traffic accident', 'head-on collision', 'hit and run', 'derailment', 'train collision'])) {
      matches.push('ROAD_ACCIDENT');
    }
    if (this.matchesAny(text, ['medical emergency', 'heart attack', 'cardiac', 'stroke', 'unconscious', 'not breathing', 'severe bleeding', 'hemorrhage', 'seizure', 'diabetic emergency', 'anaphylaxis', 'choking', 'head trauma', 'patient collapsed', 'injured person', 'chest pain', 'ambulance needed', 'respiratory arrest', 'burns'])) {
      matches.push('MEDICAL');
    }
    if (this.matchesAny(text, ['missing person', 'lost hiker', 'missing child', 'disappeared', 'unaccounted for', 'lost in forest', 'lost child', 'missing swimmer'])) {
      matches.push('MISSING_PERSON');
    }
    if (this.matchesAny(text, ['armed', 'hostage', 'active threat', 'stampede', 'riot', 'civil unrest', 'violence', 'gunfire', 'assault', 'explosion threat', 'sabotage'])) {
      matches.push('SECURITY');
    }
    if (this.matchesAny(text, ['tree branch', 'sidewalk', 'inspection', 'routine inquiry', 'status check', 'lost property', 'stray animal', 'minor maintenance', 'cleared', 'patrol'])) {
      matches.push('OTHER');
    }

    if (matches.length === 0) {
      return { category: 'UNKNOWN', categoryMatches: [], isConflicted: false };
    }

    // Deterministic Precedence Ordering
    const precedence: TriageCategory[] = [
      'HAZMAT',
      'STRUCTURAL_COLLAPSE',
      'EARTHQUAKE',
      'LANDSLIDE',
      'FLOOD',
      'FIRE',
      'ROAD_ACCIDENT',
      'MEDICAL',
      'SECURITY',
      'MISSING_PERSON',
      'OTHER',
      'UNKNOWN'
    ];

    const sortedMatches = [...matches].sort((a, b) => precedence.indexOf(a) - precedence.indexOf(b));
    const primary = sortedMatches[0];
    const isConflicted = matches.length >= 2;

    return {
      category: primary,
      categoryMatches: matches,
      isConflicted
    };
  }

  private extractSeverity(text: string): { severity: TriageSeverity; urgency: TriageUrgency; severityIndicators: string[] } {
    if (!text || text.trim().length === 0) {
      return { severity: 'UNKNOWN', urgency: 'UNKNOWN', severityIndicators: [] };
    }

    const p1Triggers = [
      'unconscious', 'unresponsive', 'not breathing', 'no pulse', 'cardiac arrest',
      'severe bleeding', 'arterial bleed', 'severe hemorrhage', 'trapped under rubble',
      'trapped in fire', 'building collapsed with people inside', 'major explosion with casualties',
      'multiple fatalities', 'mass casualty', 'crushed chest', 'severe head trauma',
      'asphyxiation', 'drowning in progress', 'life-threatening', 'critical condition',
      'multiple casualties trapped'
    ];

    const p2Triggers = [
      'serious injury', 'heavy bleeding', 'broken bone', 'compound fracture', 'severe burn',
      'second degree burn', 'multiple injured', 'trapped', 'significant fire', 'building on fire',
      'water entering house', 'toxic fumes spreading', 'dislocated', 'concussion', 'chest pain',
      'dangerous situation', 'urgent assistance', 'flames spreading'
    ];

    const p3Triggers = [
      'minor injury', 'minor cuts', 'bruises', 'sprain', 'superficial burn', 'small fire',
      'trash fire', 'localized water logging', 'minor property damage', 'fender bender',
      'stable patient', 'mild smoke inhalation', 'non-critical', 'low risk injury', 'minor leak'
    ];

    const p4Triggers = [
      'informational', 'non-urgent', 'routine inquiry', 'tree branch on sidewalk',
      'minor water leak', 'low risk', 'status check', 'lost property', 'road obstruction cleared',
      'stray animal', 'routine patrol', 'no damage reported', 'all clear'
    ];

    const p1Found = p1Triggers.filter(t => text.includes(t));
    if (p1Found.length > 0) {
      return { severity: 'P1', urgency: 'IMMEDIATE', severityIndicators: p1Found };
    }

    const p2Found = p2Triggers.filter(t => text.includes(t));
    if (p2Found.length > 0) {
      return { severity: 'P2', urgency: 'URGENT', severityIndicators: p2Found };
    }

    const p3Found = p3Triggers.filter(t => text.includes(t));
    if (p3Found.length > 0) {
      return { severity: 'P3', urgency: 'SOON', severityIndicators: p3Found };
    }

    const p4Found = p4Triggers.filter(t => text.includes(t));
    if (p4Found.length > 0) {
      return { severity: 'P4', urgency: 'ROUTINE', severityIndicators: p4Found };
    }

    return { severity: 'UNKNOWN', urgency: 'UNKNOWN', severityIndicators: [] };
  }

  private extractVictimCounts(
    text: string,
    input: AIIncidentTriageInput
  ): { estimatedVictimCount: number | null; verifiedVictimCount: number | null; victimIndicators: string[] } {
    const victimIndicators: string[] = [];
    let estimated: number | null = null;

    // Word to number mappings
    const wordNumbers: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'multiple': 3, 'several': 4, 'dozens': 12, 'many': 5
    };

    // Regex match numeric victim counts
    const numRegex = /\b(\d+)\s*(?:victims?|casualties|injured|people|persons?|dead|fatalities|patients?|trapped)\b/i;
    const numMatch = text.match(numRegex);
    if (numMatch && numMatch[1]) {
      const parsed = parseInt(numMatch[1], 10);
      if (!isNaN(parsed) && parsed >= 0) {
        estimated = parsed;
        victimIndicators.push(`explicit_count:${parsed}`);
      }
    }

    // If not found via digits, check word numbers
    if (estimated === null) {
      for (const [word, val] of Object.entries(wordNumbers)) {
        const wordRegex = new RegExp(`\\b${word}\\s*(?:victims?|casualties|injured|people|persons?|dead|patients?|trapped)\\b`, 'i');
        if (wordRegex.test(text)) {
          estimated = val;
          victimIndicators.push(`word_count:${word}(${val})`);
          break;
        }
      }
    }

    // If still null, fallback to reported count from input if provided
    if (estimated === null && input.reportedVictimCount !== undefined && input.reportedVictimCount !== null) {
      estimated = input.reportedVictimCount;
      victimIndicators.push(`reported_input:${input.reportedVictimCount}`);
    }

    // Verified victim count is NEVER inferred by AI — strictly preserves authoritative input verified count
    const verified: number | null = (input.verifiedVictimCount !== undefined && input.verifiedVictimCount !== null)
      ? input.verifiedVictimCount
      : null;

    return {
      estimatedVictimCount: estimated,
      verifiedVictimCount: verified,
      victimIndicators
    };
  }

  private extractHazards(text: string): string[] {
    const hazards: string[] = [];

    if (this.matchesAny(text, ['fire', 'flames', 'blaze', 'burning'])) hazards.push('FIRE');
    if (this.matchesAny(text, ['smoke', 'dense smoke', 'heavy smoke', 'fumes'])) hazards.push('SMOKE');
    if (this.matchesAny(text, ['power lines down', 'live wire', 'electric shock', 'transformer explosion', 'sparking wires', 'electrocution'])) hazards.push('ELECTRICAL_HAZARD');
    if (this.matchesAny(text, ['chemical spill', 'gas leak', 'ammonia leak', 'toxic fumes', 'acid leak', 'chemical', 'toxic'])) hazards.push('CHEMICAL_LEAK');
    if (this.matchesAny(text, ['unstable structure', 'falling debris', 'cracking walls', 'sagging roof', 'structural collapse', 'rubble'])) hazards.push('STRUCTURAL_INSTABILITY');
    if (this.matchesAny(text, ['fast moving water', 'rising floodwater', 'submerged road', 'flood', 'flooding', 'current'])) hazards.push('WATER_CURRENT');
    if (this.matchesAny(text, ['highway traffic', 'blind curve', 'fuel leak on road', 'road collision', 'traffic jam', 'highway', 'collision', 'vehicle accident', 'car crash', 'bus collision', 'truck crash', 'traffic hazard'])) hazards.push('TRAFFIC_HAZARD');
    if (this.matchesAny(text, ['gas cylinder', 'propane tank', 'fuel tank', 'explosion risk', 'combustible'])) hazards.push('EXPLOSION_RISK');

    return Array.from(new Set(hazards));
  }

  private extractSymptoms(text: string): string[] {
    const symptoms: string[] = [];

    if (this.matchesAny(text, ['unconscious', 'passed out', 'unresponsive'])) symptoms.push('UNCONSCIOUS');
    if (this.matchesAny(text, ['not breathing', 'difficulty breathing', 'gasping for air', 'choking', 'respiratory arrest', 'asthma attack'])) symptoms.push('RESPIRATORY_DISTRESS');
    if (this.matchesAny(text, ['heavy bleeding', 'severe bleeding', 'arterial bleeding', 'blood loss', 'hemorrhage'])) symptoms.push('SEVERE_HEMORRHAGE');
    if (this.matchesAny(text, ['broken bone', 'fracture', 'compound fracture', 'head injury', 'crush injury', 'dislocated'])) symptoms.push('FRACTURE_OR_TRAUMA');
    if (this.matchesAny(text, ['burns', 'burned skin', 'charred', 'thermal burns', 'second degree burn'])) symptoms.push('BURNS');
    if (this.matchesAny(text, ['hypothermia', 'near drowning', 'water in lungs', 'shivering uncontrollably'])) symptoms.push('HYPOTHERMIA_OR_DROWNING');
    if (this.matchesAny(text, ['minor cuts', 'scratches', 'bruising', 'laceration'])) symptoms.push('MINOR_LACERATIONS');

    return Array.from(new Set(symptoms));
  }

  private extractLocationClues(rawText: string, input: AIIncidentTriageInput): string[] {
    const clues: Set<string> = new Set();

    // Context field clues
    if (input.locationAddress && input.locationAddress.trim()) {
      clues.add(input.locationAddress.trim());
    }
    if (input.landmark && input.landmark.trim()) {
      clues.add(input.landmark.trim());
    }
    if (input.gridSquare && input.gridSquare.trim()) {
      clues.add(`Grid: ${input.gridSquare.trim()}`);
    }

    // Phrase patterns from text (near ..., beside ..., opposite ..., on ..., NH-..., mile marker ...)
    const patterns = [
      /\b(?:near|beside|opposite|behind|adjacent to|at|junction of|along|crossing)\s+([A-Za-z0-9\s,\-\#]{3,35})(?=[.,\n;]|$)/gi,
      /\b(?:nh-?\d+|state highway \d+|sector \d+|km \d+|mile marker \d+|railway station|bus stand|flyover|bridge|hospital|school|market|village|plaza)\b/gi
    ];

    for (const pattern of patterns) {
      const matches = rawText.match(pattern);
      if (matches) {
        for (const m of matches) {
          const cleaned = m.trim().replace(/^[,.\s]+|[,.\s]+$/g, '');
          if (cleaned.length >= 3 && cleaned.length <= 50) {
            clues.add(cleaned);
          }
        }
      }
    }

    return Array.from(clues);
  }

  private calculateConfidence(params: {
    normalizedText: string;
    category: TriageCategory;
    severity: TriageSeverity;
    categoryMatchesCount: number;
    severityIndicatorsCount: number;
    isConflicted: boolean;
    locationCluesCount: number;
  }): number {
    if (!params.normalizedText || params.normalizedText.length < 10) {
      return 0.20;
    }

    if (params.category === 'UNKNOWN' && params.severity === 'UNKNOWN') {
      return 0.25;
    }

    let score = 0.50;

    // Category strength
    if (params.category !== 'UNKNOWN') {
      score += 0.15;
      if (params.categoryMatchesCount >= 2) score += 0.05;
    }

    // Severity strength
    if (params.severity !== 'UNKNOWN') {
      score += 0.15;
      if (params.severityIndicatorsCount >= 2) score += 0.05;
    }

    // Location clues presence
    if (params.locationCluesCount > 0) {
      score += 0.05;
    }

    // Category conflict penalty
    if (params.isConflicted) {
      score -= 0.15;
    }

    // Bounds limit between 0.10 and 0.95
    const clamped = Math.max(0.10, Math.min(0.95, score));
    return Math.round(clamped * 100) / 100;
  }

  private evaluateHumanReview(params: {
    confidence: number;
    severity: TriageSeverity;
    category: TriageCategory;
    isConflicted: boolean;
    estimatedVictimCount: number | null;
    locationClues: string[];
    normalizedText: string;
    hasCoordinates: boolean;
  }): { requiresHumanReview: boolean; reviewReasons: string[] } {
    const reasons: string[] = [];

    if (params.confidence < 0.75) {
      reasons.push(`Low confidence score (${Math.round(params.confidence * 100)}% < 75%)`);
    }

    if (params.severity === 'P1') {
      reasons.push('High-severity (P1) emergency classification');
    }

    if (params.severity === 'UNKNOWN') {
      reasons.push('Unclassified severity level');
    }

    if (params.category === 'UNKNOWN') {
      reasons.push('Unclassified incident category');
    }

    if (params.isConflicted) {
      reasons.push('Multi-category conflict detected');
    }

    if (params.estimatedVictimCount !== null && params.estimatedVictimCount > 4) {
      reasons.push(`Multiple casualties indicated (${params.estimatedVictimCount} victims)`);
    }

    if (params.locationClues.length === 0 && !params.hasCoordinates) {
      reasons.push('Missing location clues and coordinates');
    }

    if (params.normalizedText.length < 15) {
      reasons.push('Sparse incident description text');
    }

    return {
      requiresHumanReview: reasons.length > 0,
      reviewReasons: reasons
    };
  }

  private matchesAny(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      if (lowerKw.includes(' ') || lowerKw.includes('-') || lowerKw.length > 5) {
        if (lowerText.includes(lowerKw)) {
          return true;
        }
      } else {
        const regex = new RegExp(`\\b${lowerKw}\\b`, 'i');
        if (regex.test(lowerText)) {
          return true;
        }
      }
    }
    return false;
  }
}
