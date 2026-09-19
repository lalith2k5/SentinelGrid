/**
 * SentinelGrid AI Provider Abstraction Layer
 * Supports local offline inference (Ollama, llama.cpp on Mac M2)
 * as well as cloud providers (Gemini) without locking into any paid service.
 */

export interface TriageInput {
  incidentTitle: string;
  description: string;
  callerReport?: string;
  locationDetails?: string;
}

export interface TriageResult {
  suggestedSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedResourceTypes: string[];
  urgencyScore: number; // 1-100
  rationale: string;
  hazardKeywords: string[];
  offlineGenerated: boolean;
}

export interface AIProviderStatus {
  providerId: string;
  displayName: string;
  isConfigured: boolean;
  statusMessage: string;
  requiresInternet: boolean;
  localCompatible: boolean;
  modelIdentifier?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  getStatus(): Promise<AIProviderStatus>;
  triageIncident(input: TriageInput): Promise<TriageResult>;
}
