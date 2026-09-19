import { aiRegistry } from '../ai/index.ts';
import { TriageInput, TriageResult } from '../ai/types.ts';

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
      isImplemented: false,
      statusText: 'Not configured — Coming in Phase 3',
      description: 'Automated natural language incident classification, urgency scoring, and immediate hazard detection.',
      offlineCapability: '100% offline via local LLM runtime (Ollama/llama.cpp) with zero cloud fees.'
    };
  }

  public async evaluateIncident(_input: TriageInput): Promise<TriageResult> {
    throw new Error('AITriageService is not configured yet. Architecture placeholder for Phase 3.');
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
