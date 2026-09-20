import { aiRegistry } from '../ai/index.ts';

export interface ServiceModuleInfo {
  moduleName: string;
  phasePlanned: number;
  isImplemented: boolean;
  statusText: string;
  description: string;
  offlineCapability: string;
}

/**
 * AI Triage Service (Architectural Placeholder - Phase 3)
 * Provides interface for zero-cloud local LLM triage (Ollama/Apple Silicon M2)
 * and optional cloud fallback.
 */
export class AITriageService {
  public getInfo(): ServiceModuleInfo {
    return {
      moduleName: 'AI Triage Engine',
      phasePlanned: 3,
      isImplemented: true,
      statusText: 'Operational (Local Heuristic Engine 1.0)',
      description: 'Deterministic rule-based incident classification, urgency scoring, victim estimation, and hazard detection.',
      offlineCapability: '100% offline deterministic heuristic extraction engine with zero cloud dependency.'
    };
  }

  public async getStatus() {
    const aiStatus = await aiRegistry.getPrimaryStatus();
    return {
      ...this.getInfo(),
      providerStatus: aiStatus
    };
  }
}

export const aiTriageService = new AITriageService();
