import { AIProvider, AIProviderStatus } from './types.ts';
import { LocalHeuristicProvider } from './localHeuristicProvider.ts';

export class AIServiceRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private activeProviderId: string = 'local-heuristic';

  constructor() {
    const heuristic = new LocalHeuristicProvider();
    this.providers.set(heuristic.id, heuristic);
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public setActiveProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`AI Provider with ID '${id}' is not registered.`);
    }
    this.activeProviderId = id;
  }

  public getActiveProvider(): AIProvider {
    const provider = this.providers.get(this.activeProviderId);
    if (!provider) {
      // Fallback guaranteed provider
      const fallback = new LocalHeuristicProvider();
      this.providers.set(fallback.id, fallback);
      return fallback;
    }
    return provider;
  }

  public getProviderById(id: string): AIProvider | undefined {
    return this.providers.get(id);
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
    return provider.getStatus();
  }
}

export const aiRegistry = new AIServiceRegistry();
export { LocalHeuristicProvider };
export * from './types.ts';
