import type {
  AIIncidentTriageInput,
  AIIncidentTriageRecord,
  TriageCategory,
  TriageSeverity,
  TriageUrgency
} from '../db/schema.ts';

export type {
  AIIncidentTriageInput,
  AIIncidentTriageRecord,
  TriageCategory,
  TriageSeverity,
  TriageUrgency
};

export type TriageInput = AIIncidentTriageInput;
export type TriageResult = Omit<AIIncidentTriageRecord, 'id' | 'createdAt'>;

/**
 * SentinelGrid Phase 3 AI Provider Abstraction Layer
 * 
 * CORE ARCHITECTURAL BOUNDARIES:
 * 1. AI-Assisted Emergency Triage ONLY — Never Autonomous Medical Diagnosis.
 * 2. 100% Offline, Zero Cloud Dependencies (No Gemini, No OpenAI, No external endpoints).
 * 3. Future-proof provider abstraction:
 *      AIProvider -> LocalHeuristicProvider (Phase 3 active)
 *                 -> LocalLLMProvider (Future offline local model via llama.cpp/Ollama)
 * 4. Prompt-Injection Defense Architecture:
 *    Incident descriptions and caller text are treated strictly as untrusted DATA payloads.
 *    They are NEVER concatenated into raw execution instructions, meta-prompts, or eval() calls.
 */

export interface AIProviderStatus {
  providerId: string;
  displayName: string;
  providerVersion: string;
  isConfigured: boolean;
  statusMessage: string;
  requiresInternet: boolean;
  localCompatible: boolean;
  isOffline: boolean;
  modelIdentifier?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  version: string;
  isAvailable(): Promise<boolean>;
  getStatus(): Promise<AIProviderStatus>;
  triageIncident(input: AIIncidentTriageInput): Promise<Omit<AIIncidentTriageRecord, 'id' | 'createdAt'>>;
}
