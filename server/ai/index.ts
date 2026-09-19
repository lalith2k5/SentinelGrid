import { AIProvider, AIProviderStatus } from './types.ts';
import { GeminiProvider } from './GeminiProvider.ts';
import { LocalModelProvider } from './LocalModelProvider.ts';

export class AIServiceRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private activeProviderId: string = 'local-ollama';

  constructor() {
    const local = new LocalModelProvider();
    const gemini = new GeminiProvider();
    this.providers.set(local.id, local);
    this.providers.set(gemini.id, gemini);
  }

  public getActiveProvider(): AIProvider | undefined {
    return this.providers.get(this.activeProviderId);
  }

  public async getAllStatuses(): Promise<AIProviderStatus[]> {
    const statuses: AIProviderStatus[] = [];
    for (const provider of this.providers.values()) {
      statuses.push(await provider.getStatus());
    }
    return statuses;
  }

  public async getPrimaryStatus(): Promise<AIProviderStatus> {
    const provider = this.getActiveProvider();
    if (!provider) {
      return {
        providerId: 'none',
        displayName: 'AI Engine',
        isConfigured: false,
        statusMessage: 'Not configured — Coming in Phase 3',
        requiresInternet: false,
        localCompatible: true
      };
    }
    return provider.getStatus();
  }
}

export const aiRegistry = new AIServiceRegistry();
