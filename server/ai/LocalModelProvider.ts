import { AIProvider, AIProviderStatus, TriageInput, TriageResult } from './types.ts';

/**
 * LocalModelProvider (Offline-First / Zero-Cloud Option)
 * Target for local inference on Apple Silicon (Mac M2), Linux, etc.
 * Uses local HTTP endpoints like Ollama (http://127.0.0.1:11434) or llama.cpp.
 * Zero-cloud, zero-budget, 100% offline.
 */
export class LocalModelProvider implements AIProvider {
  public id = 'local-ollama';
  public name = 'Local Offline Model (Ollama / Mac M2)';
  public version = '1.0.0';

  private localEndpoint: string;
  private modelName: string;

  constructor(endpoint = 'http://127.0.0.1:11434', modelName = 'mistral') {
    this.localEndpoint = endpoint;
    this.modelName = modelName;
  }

  public async isAvailable(): Promise<boolean> {
    return false;
  }

  public async getStatus(): Promise<AIProviderStatus> {
    return {
      providerId: this.id,
      displayName: this.name,
      providerVersion: this.version,
      isConfigured: false,
      statusMessage: 'Not configured (Future extension — Local Ollama/M2 offline inference)',
      requiresInternet: false,
      localCompatible: true,
      isOffline: true,
      modelIdentifier: this.modelName
    };
  }

  public async triageIncident(_input: TriageInput): Promise<TriageResult> {
    throw new Error('LocalModelProvider is not configured in Phase 3.');
  }
}
